/**
 * Shadow Hunters - Client (Mobile Portrait) - Tiếng Việt
 * Đầy đủ: thoát phòng, chơi lại, xúc xắc, 1 rút bài/lượt, di chuyển mỗi lượt,
 * 1 tấn công/lượt, 3 vùng, thẻ tay/trang bị
 */
const socket = io();

let state = {
  roomId: null,
  playerId: null,
  isHost: false,
  room: null,
  game: null
};

const $ = (s) => document.querySelector(s);
const lobby = $('#lobby');
const roomEl = $('#room');
const gameEl = $('#game');

$('#btnCreate').onclick = () => {
  const name = $('#playerName').value.trim() || 'Người chơi';
  socket.emit('create_room', { name }, (res) => {
    if (!res.ok) return alert(res.err || 'Lỗi');
    state.roomId = res.roomId;
    state.playerId = res.playerId;
    state.isHost = true;
    state.room = res.state;
    showRoom();
  });
};

$('#btnJoin').onclick = () => {
  const name = $('#playerName').value.trim() || 'Người chơi';
  const roomId = $('#roomCode').value.trim().toUpperCase();
  if (!roomId) return alert('Nhập mã phòng');
  socket.emit('join_room', { roomId, name }, (res) => {
    if (!res.ok) return alert(res.err || 'Lỗi');
    state.roomId = res.roomId;
    state.playerId = res.playerId;
    state.isHost = false;
    state.room = res.state;
    showRoom();
  });
};

function showRoom() {
  lobby.classList.add('hidden');
  roomEl.classList.remove('hidden');
  gameEl.classList.add('hidden');
  $('#winOverlay').classList.add('hidden');
  renderRoom();
}

function leaveToLobby() {
  if (state.roomId) socket.emit('leave_room');
  state.roomId = null;
  state.playerId = null;
  state.room = null;
  state.game = null;
  gameEl.classList.add('hidden');
  roomEl.classList.add('hidden');
  lobby.classList.remove('hidden');
  $('#winOverlay').classList.add('hidden');
  const chat = $('#chatBox');
  if (chat) chat.innerHTML = '';
}

$('#btnLeaveRoom').onclick = leaveToLobby;
$('#btnLeaveGame').onclick = leaveToLobby;
$('#btnLeaveAfter').onclick = leaveToLobby;
$('#btnNewRoom').onclick = leaveToLobby;
$('#btnPlayAgain').onclick = () => {
  socket.emit('play_again');
  $('#winOverlay').classList.add('hidden');
};

socket.on('left_room', () => leaveToLobby());

function renderRoom() {
  if (!state.room) return;
  $('#roomIdLabel').textContent = state.room.id;
  const list = $('#playerList');
  list.innerHTML = state.room.players.map(p =>
    `<div class="player-chip ${p.id === state.room.hostId ? 'host' : ''}">${p.name}${p.id === state.room.hostId ? ' 👑' : ''}</div>`
  ).join('');
  const isHost = state.room.hostId === state.playerId;
  $('#btnStart').classList.toggle('hidden', !isHost);
  $('#waitMsg').classList.toggle('hidden', isHost);
  $('#btnStart').disabled = state.room.players.length < 4;
  $('#btnStart').textContent = state.room.players.length < 4
    ? `Cần thêm ${4 - state.room.players.length} người`
    : 'Bắt đầu game';
}

$('#btnCopy').onclick = () => {
  navigator.clipboard?.writeText(state.roomId).then(() => alert('Đã sao chép mã phòng: ' + state.roomId));
};

$('#btnStart').onclick = () => socket.emit('start_game');

$('#btnChat').onclick = sendChat;
$('#chatInput').onkeydown = (e) => { if (e.key === 'Enter') sendChat(); };
function sendChat() {
  const msg = $('#chatInput').value.trim();
  if (!msg) return;
  socket.emit('chat', { msg });
  $('#chatInput').value = '';
}

socket.on('room_update', (s) => {
  state.room = s;
  if (!gameEl.classList.contains('hidden')) return;
  renderRoom();
});

socket.on('chat', (entry) => {
  const box = $('#chatBox');
  box.innerHTML += `<div class="chat-msg"><span class="name">${entry.name}:</span> ${escapeHtml(entry.msg)}</div>`;
  box.scrollTop = box.scrollHeight;
});

socket.on('error_msg', (msg) => alert(msg));

socket.on('game_start', (gs) => {
  state.game = gs;
  roomEl.classList.add('hidden');
  gameEl.classList.remove('hidden');
  $('#winOverlay').classList.add('hidden');
  renderGame();
});

socket.on('game_update', (gs) => {
  state.game = gs;
  renderGame();
});

socket.on('dice_roll', ({ playerName, d6, d4, total }) => {
  const overlay = $('#diceOverlay');
  if (!overlay) return;
  $('#diceLabel').textContent = `${playerName} tung xúc xắc...`;
  const die6 = $('#die6');
  const die4 = $('#die4');
  die6.textContent = '?';
  die4.textContent = '?';
  $('#diceTotal').textContent = '';
  overlay.classList.remove('hidden');
  die6.style.animation = 'none';
  void die6.offsetWidth;
  die6.style.animation = 'diceShake 0.45s ease-in-out';
  die4.style.animation = 'none';
  void die4.offsetWidth;
  die4.style.animation = 'diceShake 0.45s ease-in-out';

  let n = 0;
  const iv = setInterval(() => {
    die6.textContent = Math.floor(Math.random() * 6) + 1;
    die4.textContent = Math.floor(Math.random() * 4) + 1;
    n++;
    if (n > 10) {
      clearInterval(iv);
      die6.textContent = d6;
      die4.textContent = d4;
      let txt = `Tổng: ${total}`;
      if (total === 7) txt += ' → chọn vùng bất kỳ!';
      $('#diceTotal').textContent = txt;
      setTimeout(() => overlay.classList.add('hidden'), 1600);
    }
  }, 70);
});

function renderGame() {
  const g = state.game;
  if (!g) return;

  const cur = g.players.find(p => p.id === g.currentPlayerId);
  const isMe = g.currentPlayerId === g.myId;
  $('#turnInfo').textContent = isMe ? '⚡ Lượt của BẠN' : `Lượt: ${cur?.name || '—'}`;

  const me = g.players.find(p => p.id === g.myId);
  if (me) {
    $('#myCharName').textContent = me.character || '???';
    $('#myFaction').textContent = me.faction || '';
    $('#myFaction').className = 'faction-' + (me.faction || '');
    $('#myHp').textContent = `HP ${me.maxHp - me.damage}/${me.maxHp}`;
    $('#myWin').textContent = 'Thắng: ' + (me.character ? (CHAR_WINS[me.character] || '') : '???');
    let ab = me.character ? (CHAR_ABILITIES[me.character] || '') : '';
    if (me.equipment && me.equipment.length) ab += ' | TB: ' + me.equipment.map(e => e.name).join(', ');
    if (me.hand && me.hand.length) ab += ' | Tay: ' + me.hand.map(h => h.name).join(', ');
    $('#myAbility').textContent = ab;
  }

  const board = $('#board');
  board.innerHTML = '';
  const pairs = g.pairs || [];
  const zoneColors = ['#e94560', '#3498db', '#2ecc71'];
  pairs.forEach((pair, zi) => {
    const zoneWrap = document.createElement('div');
    zoneWrap.className = 'zone-wrap';
    zoneWrap.style.borderColor = zoneColors[zi % 3];
    const zLabel = document.createElement('div');
    zLabel.className = 'zone-label';
    zLabel.style.color = zoneColors[zi % 3];
    zLabel.textContent = `Vùng ${zi + 1} (tấn công trong vùng)`;
    zoneWrap.appendChild(zLabel);
    const row = document.createElement('div');
    row.className = 'zone-row';
    pair.forEach(areaId => {
      const area = g.areas.find(a => a.id === areaId);
      if (!area) return;
      const tokens = g.players.filter(pl => pl.alive && pl.location === areaId);
      const isMeHere = tokens.some(t => t.id === g.myId);
      const div = document.createElement('div');
      div.className = 'area-card' + (isMeHere ? ' active-me' : '');
      div.style.borderColor = isMeHere ? '#f5a623' : zoneColors[zi % 3] + '88';
      div.innerHTML = `
        <div class="area-nums">${area.numbers.join(' · ')}</div>
        <div class="area-name">${area.name}</div>
        <div class="area-desc">(${area.desc || ''})</div>
        <div class="tokens">${tokens.map(t =>
          `<div class="token" style="background:${t.color}" title="${t.name}"></div>`
        ).join('')}</div>
      `;
      row.appendChild(div);
    });
    zoneWrap.appendChild(row);
    board.appendChild(zoneWrap);
  });

  const strip = $('#playersStrip');
  strip.innerHTML = g.players.map(p => {
    const hpPct = Math.max(0, 100 - (p.damage / p.maxHp * 100));
    return `<div class="p-card ${p.isCurrent ? 'current' : ''} ${!p.alive ? 'dead' : ''}" data-id="${p.id}">
      <div class="p-name" style="color:${p.color}">${p.name}</div>
      ${p.revealed && p.character ? `<div class="p-char">${p.character}</div>` : ''}
      <div class="p-hp"><div class="p-hp-fill" style="width:${hpPct}%"></div></div>
      <div class="p-equip">${p.equipment.length ? p.equipment.map(e => e.name.slice(0, 10)).join(', ') : '—'}</div>
    </div>`;
  }).join('');

  renderActions(g, me, isMe);

  const logEl = $('#gameLog');
  logEl.innerHTML = (g.log || []).map(l =>
    `<div class="log-line ${l.msg.includes('🎉') || l.msg.includes('loại') || l.msg.includes('thắng') ? 'important' : ''}">${escapeHtml(l.msg)}</div>`
  ).join('');
  logEl.scrollTop = logEl.scrollHeight;

  if (g.phase === 'ended') {
    $('#winOverlay').classList.remove('hidden');
    const names = (g.winners || []).map(id => {
      const p = g.players.find(pl => pl.id === id);
      return p ? `${p.name} (${p.character})` : id;
    });
    $('#winNames').innerHTML = names.join('<br>') || 'Hòa';
  } else {
    $('#winOverlay').classList.add('hidden');
  }
}

const CHAR_WINS = {
  Werewolf: 'Tiêu diệt hết Hunter HOẶC 3 Neutral chết',
  Vampire: 'Tiêu diệt hết Hunter HOẶC 3 Neutral chết',
  Unknown: 'Tiêu diệt hết Hunter HOẶC 3 Neutral chết',
  'Ultra Soul': 'Tiêu diệt hết Hunter HOẶC 3 Neutral chết',
  Valkyrie: 'Tiêu diệt hết Hunter HOẶC 3 Neutral chết',
  Wight: 'Tiêu diệt hết Hunter HOẶC 3 Neutral chết',
  Emi: 'Tiêu diệt hết Shadow',
  Franklin: 'Tiêu diệt hết Shadow',
  George: 'Tiêu diệt hết Shadow',
  Ellen: 'Tiêu diệt hết Shadow',
  'Fu-ka': 'Tiêu diệt hết Shadow',
  Gregor: 'Tiêu diệt hết Shadow',
  Allie: 'Còn sống khi game kết thúc',
  Bob: 'Sở hữu từ 5 trang bị trở lên',
  Charles: 'Ra đòn kết liễu khi đã có ≥3 người chết',
  Daniel: 'Chết đầu tiên HOẶC còn sống khi hết Shadow',
  Agnes: 'Còn sống và người bên phải thắng',
  Bryan: 'Giết người HP≤12 HOẶC còn sống ở Nhà thờ lúc hết game',
  Catherine: 'Chết đầu tiên HOẶC là 1 trong 2 người sống sót cuối',
  David: 'Thu thập 3 trang bị Thánh'
};

const CHAR_ABILITIES = {
  Werewolf: 'Phản công ngay sau khi bị tấn công cận chiến',
  Vampire: 'Gây sát thương tấn công thành công → hồi 2 máu',
  Unknown: 'Nhận thẻ Hermit có thể nói dối (không chịu hiệu ứng)',
  'Ultra Soul': 'Đầu lượt: gây 1 sát thương người ở Cổng Địa ngục',
  Valkyrie: 'Tấn công chỉ tung D4, sát thương = số nút',
  Wight: 'Sau lượt có thể đi thêm 1 lượt (1 lần/trận)',
  Emi: 'Di chuyển: có thể dịch tới vùng kề thay vì tung xúc xắc',
  Franklin: '1 lần/trận đầu lượt: gây sát thương = D6',
  George: '1 lần/trận đầu lượt: gây sát thương = D4',
  Ellen: '1 lần/trận đầu lượt: xóa vĩnh viễn kỹ năng 1 người',
  'Fu-ka': '1 lần/trận đầu lượt: đặt sát thương 1 người về đúng 7',
  Gregor: '1 lần/trận sau lượt: miễn mọi sát thương đến lượt sau',
  Allie: '1 lần/trận: hồi đầy máu',
  Bob: 'Gây ≥2 sát thương: có thể cướp 1 trang bị thay vì gây sát thương',
  Charles: 'Sau khi kết liễu bằng tấn công: tự nhận 2 sát thương',
  Daniel: 'Khi có người chết đầu tiên: bắt buộc tiết lộ nhân vật',
  Agnes: '1 lần/trận: đổi điều kiện thắng thành của người bên phải',
  Bryan: 'Giết người HP≥13: phải tiết lộ nhân vật',
  Catherine: 'Đầu mỗi lượt: hồi 1 máu',
  David: 'Mỗi khi có người chết: lấy 1 trang bị từ họ'
};
function renderActions(g, me, isMe) {
  const btns = $('#actionButtons');
  const pending = $('#pendingPanel');
  btns.innerHTML = '';
  pending.classList.add('hidden');
  pending.innerHTML = '';

  if (!isMe || !me?.alive || g.phase === 'ended') {
    btns.innerHTML = '<div style="color:#888;padding:8px;width:100%;text-align:center">Đang chờ lượt...</div>';
    if (me?.alive && !me.revealed) {
      btns.innerHTML += `<button class="btn" id="actReveal">Tiết lộ nhân vật</button>`;
      $('#actReveal').onclick = () => doAction('reveal');
    }
    if (me?.alive && me.character === 'Allie' && !me.abilityUsed) {
      btns.innerHTML += `<button class="btn primary" id="actAllie">Hồi đầy máu (Allie)</button>`;
      $('#actAllie').onclick = () => doAction('use_ability');
    }
    return;
  }

  if (g.pending) {
    pending.classList.remove('hidden');
    pending.innerHTML = `<h4>${g.pending.msg || 'Chọn hành động'}</h4><div class="choices" id="pendingChoices"></div>`;
    renderPendingChoices(g, me, $('#pendingChoices'));
    return;
  }

  const hasMoved = !!me.hasMovedThisTurn;
  const hasArea = !!me.hasAreaActionThisTurn;
  const hasAttacked = !!me.hasAttackedThisTurn;

  if (!hasMoved) {
    btns.innerHTML = `<button class="btn primary" id="actMove">🎲 Di chuyển (bắt buộc)</button>`;
    $('#actMove').onclick = () => doMove();
    return;
  }

  let html = '';
  if (!hasArea) html += `<button class="btn" id="actArea">📜 Rút bài</button>`;
  if (!hasAttacked) html += `<button class="btn" id="actAttack">⚔️ Tấn công</button>`;
  html += `
    <button class="btn" id="actEnd">✅ Kết thúc lượt</button>
    <button class="btn" id="actReveal2">👁️ Tiết lộ nhân vật</button>
  `;
  btns.innerHTML = html;

  if (!hasArea && $('#actArea')) $('#actArea').onclick = () => doAction('area_action');
  if (!hasAttacked && $('#actAttack')) $('#actAttack').onclick = () => openAttackModal(g, me);
  $('#actEnd').onclick = () => doAction('end_turn');
  $('#actReveal2').onclick = () => doAction('reveal');

  if (['Franklin', 'George', 'Fu-ka', 'Ellen', 'Ultra Soul'].includes(me.character) && !me.abilityUsed && !me.abilityDisabled) {
    const b = document.createElement('button');
    b.className = 'btn primary';
    b.textContent = '✨ Kỹ năng ' + me.character;
    b.onclick = () => openAbilityModal(g, me);
    btns.appendChild(b);
  }
  if (me.character === 'Gregor' && !me.abilityUsed && !me.abilityDisabled) {
    const b = document.createElement('button');
    b.className = 'btn primary';
    b.textContent = '🛡️ Khiên bảo vệ';
    b.onclick = () => doAction('use_ability');
    btns.appendChild(b);
  }
  if (me.character === 'Allie' && !me.abilityUsed) {
    const b = document.createElement('button');
    b.className = 'btn primary';
    b.textContent = '💚 Hồi đầy máu';
    b.onclick = () => doAction('use_ability');
    btns.appendChild(b);
  }
  if (me.hand && me.hand.length && hasMoved) {
    me.hand.forEach(card => {
      const b = document.createElement('button');
      b.className = 'btn';
      b.style.background = '#1a4a3a';
      b.textContent = '📜 ' + card.name;
      b.onclick = () => {
        if (confirm(`Dùng thẻ "${card.name}"?\n${card.desc}`)) {
          doAction('use_hand_card', { cardId: card.id });
        }
      };
      btns.appendChild(b);
    });
  }
}

function renderPendingChoices(g, me, container) {
  const pend = g.pending;
  const alive = g.players.filter(p => p.alive);

  if (pend.type === 'show_card') {
    const card = pend.card;
    const info = document.createElement('div');
    info.style.cssText = 'width:100%;margin-bottom:10px;padding:10px;background:#16213e;border-radius:8px;';
    const kind = pend.equipped ? '⚔️ TRANG BỊ (giữ trên người)' : '📜 THẺ TAY (có thể giữ & dùng sau)';
    info.innerHTML = `<div style="color:#f5a623;font-weight:700;margin-bottom:6px">${kind}</div>
      <div style="font-size:1rem;font-weight:600;margin-bottom:4px">${card.name}</div>
      <div style="font-size:0.85rem;color:#ccc;line-height:1.4">${card.desc}</div>`;
    container.appendChild(info);
    if (pend.inHand) {
      const useNow = document.createElement('button');
      useNow.className = 'btn primary';
      useNow.textContent = 'Dùng ngay';
      useNow.onclick = () => doAction('resolve_pending', { useNow: true });
      container.appendChild(useNow);
      const keep = document.createElement('button');
      keep.className = 'btn';
      keep.textContent = 'Giữ trong tay';
      keep.onclick = () => doAction('resolve_pending', {});
      container.appendChild(keep);
    } else {
      const ok = document.createElement('button');
      ok.className = 'btn primary';
      ok.textContent = 'Đã xem';
      ok.onclick = () => doAction('resolve_pending', {});
      container.appendChild(ok);
    }
  } else if (pend.type === 'hermit_give') {
    if (pend.card) {
      const info = document.createElement('div');
      info.style.cssText = 'width:100%;font-size:0.8rem;color:#aaa;margin-bottom:6px';
      info.textContent = `Thẻ: ${pend.card.name} — ${pend.card.desc}`;
      container.appendChild(info);
    }
    alive.filter(p => p.id !== me.id).forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = p.name;
      btn.onclick = () => doAction('resolve_pending', { targetId: p.id });
      container.appendChild(btn);
    });
  } else if (pend.type === 'choose_deck') {
    const labels = { white: 'TRẮNG', black: 'ĐEN', hermit: 'HERMIT' };
    ['white', 'black', 'hermit'].forEach(d => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = labels[d];
      btn.onclick = () => doAction('resolve_pending', { deck: d });
      container.appendChild(btn);
    });
  } else if (pend.type === 'weird') {
    alive.forEach(p => {
      const h = document.createElement('button');
      h.className = 'btn';
      h.textContent = `Hồi 1 → ${p.name}`;
      h.onclick = () => doAction('resolve_pending', { action: 'heal', targetId: p.id });
      container.appendChild(h);
      const d = document.createElement('button');
      d.className = 'btn';
      d.textContent = `Gây 2 → ${p.name}`;
      d.onclick = () => doAction('resolve_pending', { action: 'damage', targetId: p.id });
      container.appendChild(d);
    });
  } else if (pend.type === 'steal_equip') {
    const withEq = alive.filter(p => p.id !== me.id && p.equipment.length);
    if (!withEq.length) {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = 'Không ai có trang bị — Bỏ qua';
      btn.onclick = () => doAction('resolve_pending', {});
      container.appendChild(btn);
    } else {
      withEq.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = `${p.name} (${p.equipment.length} trang bị)`;
        btn.onclick = () => doAction('resolve_pending', { targetId: p.id });
        container.appendChild(btn);
      });
    }
  } else if (pend.type === 'resolve_card') {
    const card = pend.card;
    const info = document.createElement('div');
    info.style.cssText = 'width:100%;margin-bottom:8px;color:#f5a623';
    info.textContent = `${card.name}: ${card.desc}`;
    container.appendChild(info);
    const needsTarget = ['heal_any_2', 'heal_any_1', 'steal_equip', 'damage_2_any', 'damage_2_heal1', 'damage_or_heal', 'peek_character', 'blessing', 'first_aid', 'disenchant', 'banana', 'spider', 'bat', 'doll'].includes(card.effect);
    if (needsTarget) {
      alive.forEach(p => {
        if (card.effect === 'damage_or_heal') {
          const h = document.createElement('button');
          h.className = 'btn';
          h.textContent = `Hồi 3 → ${p.name}`;
          h.onclick = () => doAction('resolve_pending', { action: 'heal', targetId: p.id });
          container.appendChild(h);
          const d = document.createElement('button');
          d.className = 'btn';
          d.textContent = `Gây 3 → ${p.name}`;
          d.onclick = () => doAction('resolve_pending', { action: 'damage', targetId: p.id });
          container.appendChild(d);
        } else {
          const btn = document.createElement('button');
          btn.className = 'btn';
          btn.textContent = p.name;
          btn.onclick = () => doAction('resolve_pending', { targetId: p.id });
          container.appendChild(btn);
        }
      });
    } else {
      const btn = document.createElement('button');
      btn.className = 'btn primary';
      btn.textContent = 'Xác nhận';
      btn.onclick = () => doAction('resolve_pending', {});
      container.appendChild(btn);
    }
  } else if (pend.type === 'bob_robbery') {
    const yes = document.createElement('button');
    yes.className = 'btn primary';
    yes.textContent = 'Cướp trang bị';
    yes.onclick = () => doAction('resolve_pending', { steal: true });
    container.appendChild(yes);
    const no = document.createElement('button');
    no.className = 'btn';
    no.textContent = 'Gây sát thương';
    no.onclick = () => doAction('resolve_pending', { steal: false });
    container.appendChild(no);
  } else if (pend.type === 'wight_extra') {
    const yes = document.createElement('button');
    yes.className = 'btn primary';
    yes.textContent = 'Đi thêm 1 lượt!';
    yes.onclick = () => doAction('resolve_pending', { extra: true });
    container.appendChild(yes);
    const no = document.createElement('button');
    no.className = 'btn';
    no.textContent = 'Không';
    no.onclick = () => doAction('resolve_pending', { extra: false });
    container.appendChild(no);
  }
}

function doMove() {
  doAction('move', {}, (res) => {
    if (res.needChoose) openAreaChooseModal(state.game, res.rolls);
  });
}

function openAreaChooseModal(g, rolls) {
  const modal = $('#modal');
  $('#modalTitle').textContent = `Xúc xắc ${rolls.d6}+${rolls.d4}=7 — Chọn vùng khác`;
  const body = $('#modalBody');
  body.innerHTML = '';
  const me = g.players.find(p => p.id === g.myId);
  g.areas.forEach(a => {
    if (me && me.location === a.id) return;
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = `${a.numbers.join('·')} ${a.name} (${a.desc || ''})`;
    btn.onclick = () => {
      modal.classList.add('hidden');
      doAction('move', { areaId: a.id });
    };
    body.appendChild(btn);
  });
  modal.classList.remove('hidden');
}

function openAttackModal(g, me) {
  const modal = $('#modal');
  $('#modalTitle').textContent = 'Chọn mục tiêu tấn công';
  const body = $('#modalBody');
  body.innerHTML = '';
  const myPair = (g.pairs || []).find(pr => pr.includes(me.location));
  const hasHandgun = me.equipment?.some(e => e.effect === 'handgun');
  g.players.filter(p => p.alive && p.id !== me.id).forEach(p => {
    let inRange = false;
    if (hasHandgun) inRange = p.location !== me.location && !(myPair && myPair.includes(p.location));
    else inRange = myPair && myPair.includes(p.location);
    if (!inRange) return;
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = `${p.name} (HP ${p.maxHp - p.damage}/${p.maxHp})`;
    btn.onclick = () => {
      modal.classList.add('hidden');
      doAction('attack', { targetId: p.id });
    };
    body.appendChild(btn);
  });
  if (!body.children.length) {
    body.innerHTML = '<p style="color:#888">Không có mục tiêu trong tầm tấn công.</p>';
  }
  modal.classList.remove('hidden');
}

function openAbilityModal(g, me) {
  const modal = $('#modal');
  $('#modalTitle').textContent = me.character + ' — Chọn mục tiêu';
  const body = $('#modalBody');
  body.innerHTML = '';
  g.players.filter(p => p.alive && p.id !== me.id).forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = `${p.name} (${p.maxHp - p.damage}/${p.maxHp})`;
    btn.onclick = () => {
      modal.classList.add('hidden');
      doAction('use_ability', { targetId: p.id });
    };
    body.appendChild(btn);
  });
  modal.classList.remove('hidden');
}

$('#modalClose').onclick = () => $('#modal').classList.add('hidden');

function doAction(action, data = {}, cb) {
  socket.emit('game_action', { action, data }, (res) => {
    if (res && !res.ok && res.err) alert(res.err);
    if (cb) cb(res || {});
  });
}

$('#btnReveal').onclick = () => doAction('reveal');

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });