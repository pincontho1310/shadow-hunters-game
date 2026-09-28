/**
 * Shadow Hunters - Multiplayer Server (Tiếng Việt)
 * Full: di chuyển mỗi lượt, 1 rút bài/lượt, 1 tấn công/lượt, vòng lượt,
 * thoát phòng, chơi lại, xúc xắc, 3 vùng, thẻ tay/trang bị, 16+16+16 thẻ
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, '../client')));

const PORT = process.env.PORT || 3000;

const AREAS = [
  { id: 1, name: 'Túp lều Ẩn sĩ', numbers: [2, 3], action: 'hermit', desc: 'Rút thẻ Hermit, đưa cho 1 người chơi' },
  { id: 2, name: 'Cổng Địa ngục', numbers: [4, 5], action: 'underworld', desc: 'Chọn rút thẻ Trắng / Đen / Hermit' },
  { id: 3, name: 'Nhà thờ', numbers: [6], action: 'white', desc: 'Rút 1 thẻ Trắng' },
  { id: 4, name: 'Nghĩa trang', numbers: [8], action: 'black', desc: 'Rút 1 thẻ Đen' },
  { id: 5, name: 'Rừng Kỳ quái', numbers: [9], action: 'weird', desc: 'Hồi 1 máu HOẶC gây 2 sát thương' },
  { id: 6, name: 'Bàn thờ Xưa', numbers: [10], action: 'altar', desc: 'Cướp 1 trang bị của người khác' }
];

const CHARACTERS = {
  Werewolf: { name: 'Werewolf', faction: 'Shadow', hp: 14, revealRequired: true },
  Vampire: { name: 'Vampire', faction: 'Shadow', hp: 13, revealRequired: true },
  Unknown: { name: 'Unknown', faction: 'Shadow', hp: 11, revealRequired: false },
  'Ultra Soul': { name: 'Ultra Soul', faction: 'Shadow', hp: 11, revealRequired: true },
  Valkyrie: { name: 'Valkyrie', faction: 'Shadow', hp: 13, revealRequired: true },
  Wight: { name: 'Wight', faction: 'Shadow', hp: 14, revealRequired: true },
  Emi: { name: 'Emi', faction: 'Hunter', hp: 10, revealRequired: true },
  Franklin: { name: 'Franklin', faction: 'Hunter', hp: 12, revealRequired: true },
  George: { name: 'George', faction: 'Hunter', hp: 14, revealRequired: true },
  Ellen: { name: 'Ellen', faction: 'Hunter', hp: 10, revealRequired: true },
  'Fu-ka': { name: 'Fu-ka', faction: 'Hunter', hp: 12, revealRequired: true },
  Gregor: { name: 'Gregor', faction: 'Hunter', hp: 14, revealRequired: true },
  Allie: { name: 'Allie', faction: 'Neutral', hp: 8, revealRequired: true },
  Bob: { name: 'Bob', faction: 'Neutral', hp: 10, revealRequired: true },
  Charles: { name: 'Charles', faction: 'Neutral', hp: 11, revealRequired: true },
  Daniel: { name: 'Daniel', faction: 'Neutral', hp: 13, revealRequired: false },
  Agnes: { name: 'Agnes', faction: 'Neutral', hp: 8, revealRequired: true },
  Bryan: { name: 'Bryan', faction: 'Neutral', hp: 10, revealRequired: true },
  Catherine: { name: 'Catherine', faction: 'Neutral', hp: 11, revealRequired: true },
  David: { name: 'David', faction: 'Neutral', hp: 13, revealRequired: true }
};

const ROLE_COUNTS = {
  4: { Shadow: 2, Hunter: 2, Neutral: 0 },
  5: { Shadow: 2, Hunter: 2, Neutral: 1 },
  6: { Shadow: 2, Hunter: 2, Neutral: 2 },
  7: { Shadow: 2, Hunter: 2, Neutral: 3 },
  8: { Shadow: 3, Hunter: 3, Neutral: 2 }
};

const WHITE_CARDS = [
  { id: 'w1', name: 'Hồi sinh (Advent)', type: 'single', effect: 'advent', desc: 'Nếu bạn là Hunter: tiết lộ danh tính để hồi đầy máu.' },
  { id: 'w2', name: 'Sô-cô-la', type: 'single', effect: 'chocolate', desc: 'Nếu bạn là Allie, Emi hoặc Unknown: tiết lộ để hồi đầy máu.' },
  { id: 'w3', name: 'Phước lành', type: 'single', effect: 'blessing', desc: 'Chọn 1 người khác: họ hồi máu = kết quả D6.' },
  { id: 'w4', name: 'Sơ cứu', type: 'single', effect: 'first_aid', desc: 'Đặt sát thương của 1 người (có thể bạn) thành đúng 7.' },
  { id: 'w5', name: 'Nước thánh chữa lành', type: 'single', effect: 'holy_water', desc: 'Hồi 2 HP cho bản thân.' },
  { id: 'w6', name: 'Tri thức ẩn', type: 'single', effect: 'concealed', desc: 'Giữ lại. Dùng trong lượt: đổi chỗ 2 Khu vực trên bàn.' },
  { id: 'w7', name: 'Thiên thần hộ mệnh', type: 'single', effect: 'guardian', desc: 'Miễn sát thương tấn công đến lượt tiếp theo của bạn.' },
  { id: 'w8', name: 'Gương giải trừ', type: 'single', effect: 'disenchant', desc: 'Buộc 1 Shadow chưa lộ phải tiết lộ danh tính.' },
  { id: 'w9', name: 'Thương phản bội', type: 'equip', effect: 'spear_traitor', desc: 'Đã lộ: +1 sát thương tấn công. Chưa lộ: tự nhận 1 sát thương khi tấn công trúng.', holy: false },
  { id: 'w10', name: 'Tràng hạt bạc', type: 'equip', effect: 'rosary', desc: 'Khi giết người: lấy HẾT trang bị của họ.', holy: true },
  { id: 'w11', name: 'Bùa hộ mệnh', type: 'equip', effect: 'talisman', desc: 'Miễn sát thương từ Nhện, Dơi, Thuốc nổ.', holy: true },
  { id: 'w12', name: 'Áo choàng thánh', type: 'equip', effect: 'robe', desc: '-1 sát thương nhận từ tấn công (tối thiểu 0).', holy: true },
  { id: 'w13', name: 'Bùa bảo hộ', type: 'equip', effect: 'amulet', desc: 'Miễn mọi sát thương từ thẻ Đen.', holy: true },
  { id: 'w14', name: 'Thập tự giá', type: 'equip', effect: 'cross', desc: 'Hunter/Neutral bị hạ: tiết lộ để sống lại với 1 HP còn lại.', holy: true },
  { id: 'w15', name: 'Trâm may mắn', type: 'equip', effect: 'brooch', desc: 'Ở Rừng Kỳ quái: hồi 1 hoặc gây 1.', holy: false },
  { id: 'w16', name: 'Áo sa môn', type: 'equip', effect: 'monk_robe', desc: 'Chuyển đòn tấn công nhắm vào bạn sang người khác cùng ô.', holy: false }
];

const BLACK_CARDS = [
  { id: 'b1', name: 'Vỏ chuối', type: 'single', effect: 'banana', desc: 'Đưa 1 trang bị cho người khác. Không có: tự nhận 1 sát thương.' },
  { id: 'b2', name: 'Nhện hút máu', type: 'single', effect: 'spider', desc: 'Gây 2 sát thương 1 người và tự nhận 2 sát thương.' },
  { id: 'b3', name: 'Nghi thức quỷ', type: 'single', effect: 'diabolic', desc: 'Nếu Shadow: tiết lộ để hồi đầy máu.' },
  { id: 'b4', name: 'Thuốc nổ', type: 'single', effect: 'dynamite', desc: 'Tung D4+D6. Gây 3 sát thương mọi người ở ô = tổng.' },
  { id: 'b5', name: 'Dơi hút máu', type: 'single', effect: 'bat', desc: 'Gây 2 sát thương 1 người; bạn hồi 1 HP.' },
  { id: 'b6', name: 'Búp bê tâm linh', type: 'single', effect: 'doll', desc: 'Chọn 1 người. D6: 1-4 họ nhận 3; 5-6 bạn nhận 3.' },
  { id: 'b7', name: 'Dao phay', type: 'equip', effect: 'plus1', desc: 'Tấn công thành công: +1 sát thương.' },
  { id: 'b8', name: 'Cưa máy', type: 'equip', effect: 'plus1', desc: 'Tấn công thành công: +1 sát thương.' },
  { id: 'b9', name: 'Súng máy', type: 'equip', effect: 'machinegun', desc: 'Tấn công diện rộng: mọi người cùng vùng.' },
  { id: 'b10', name: 'Súng ngắn', type: 'equip', effect: 'handgun', desc: 'Chỉ tấn công người KHÔNG cùng vùng.' },
  { id: 'b11', name: 'Rìu', type: 'equip', effect: 'plus1', desc: 'Tấn công thành công: +1 sát thương.' },
  { id: 'b12', name: 'Đại đao', type: 'equip', effect: 'plus1', desc: 'Tấn công thành công: +1 sát thương.' },
  { id: 'b13', name: 'Kiếm nguyền', type: 'equip', effect: 'cursed_sword', desc: 'Bắt buộc tấn công nếu có mục tiêu. Trúng: +1 sát thương.' },
  { id: 'b14', name: 'Áo choàng nặng', type: 'equip', effect: 'heavy_cloak', desc: 'Di chuyển: có thể ±1 so với xúc xắc.' },
  { id: 'b15', name: 'Kiếm Saber', type: 'equip', effect: 'plus1', desc: 'Tấn công thành công: +1 sát thương.' },
  { id: 'b16', name: 'Điên loạn', type: 'single', effect: 'madness', desc: 'Sau khi kết thúc lượt, được đi thêm 1 lượt ngay.' }
];

const HERMIT_CARDS = [
  { id: 'h1', name: "Hermit's Aid (Giúp đỡ)", test: 'Hunter', effect: 'heal_1_or_damage', desc: 'Hunter: hồi 1 HP. Nếu 0 sát thương: nhận 1 sát thương.' },
  { id: 'h2', name: "Hermit's Nurturance (Nuôi dưỡng)", test: 'Neutral', effect: 'heal_1_or_damage', desc: 'Neutral: hồi 1 HP. Nếu 0 sát thương: nhận 1 sát thương.' },
  { id: 'h3', name: "Hermit's Comfort (An ủi)", test: 'Shadow', effect: 'heal_1_or_damage', desc: 'Shadow: hồi 1 HP. Nếu 0 sát thương: nhận 1 sát thương.' },
  { id: 'h4', name: "Hermit's Anger (Phẫn nộ)", test: 'Hunter|Shadow', effect: 'equip_or_damage_1', desc: 'Hunter/Shadow: đưa 1 trang bị hoặc nhận 1 sát thương.' },
  { id: 'h5', name: "Hermit's Greed (Tham lam)", test: 'Hunter|Neutral', effect: 'equip_or_damage_1', desc: 'Hunter/Neutral: đưa 1 trang bị hoặc nhận 1 sát thương.' },
  { id: 'h6', name: "Hermit's Blackmail (Tống tiền)", test: 'Shadow|Neutral', effect: 'equip_or_damage_1', desc: 'Shadow/Neutral: đưa 1 trang bị hoặc nhận 1 sát thương.' },
  { id: 'h7', name: "Hermit's Slap (Tát)", test: 'Hunter', effect: 'damage_1', desc: 'Hunter: nhận 1 sát thương.' },
  { id: 'h8', name: "Hermit's Spell (Bùa chú)", test: 'Shadow', effect: 'damage_1', desc: 'Shadow: nhận 1 sát thương.' },
  { id: 'h9', name: "Hermit's Bully (Bắt nạt)", test: 'hp_ge_11', effect: 'damage_1', desc: 'HP tối đa ≥11: nhận 1 sát thương.' },
  { id: 'h10', name: "Hermit's Tough Lesson (Bài học)", test: 'hp_le_10', effect: 'damage_1', desc: 'HP tối đa ≤10: nhận 1 sát thương.' },
  { id: 'h11', name: "Hermit's Prediction (Dự đoán)", test: 'any', effect: 'reveal_faction', desc: 'Phải cho người đưa bài xem phe của bạn.' },
  { id: 'h12', name: "Hermit's Huddle (Tụ họp)", test: 'female', effect: 'damage_1', desc: 'Nữ (Allie, Emi, Catherine, Vampire): nhận 1 sát thương.' },
  { id: 'h13', name: "Hermit's Exorcism (Trục xuất)", test: 'Shadow', effect: 'damage_2', desc: 'Shadow: nhận 2 sát thương.' },
  { id: 'h14', name: "Hermit's Vigor (Sức sống)", test: 'hp_lt_12', effect: 'damage_1', desc: 'HP tối đa <12: nhận 1 sát thương. ≥12: không sao.' },
  { id: 'h15', name: "Hermit's Ghost (Linh hồn)", test: 'not_shadow', effect: 'damage_1', desc: 'Không phải Shadow: nhận 1 sát thương. Shadow: không sao.' },
  { id: 'h16', name: "Hermit's Test (Thử thách)", test: 'Neutral', effect: 'damage_1', desc: 'Neutral: nhận 1 sát thương.' }
];

const rooms = {};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function createDeck(cards) { return shuffle(cards.map(c => ({ ...c }))); }
function rollD6() { return Math.floor(Math.random() * 6) + 1; }
function rollD4() { return Math.floor(Math.random() * 4) + 1; }

class Room {
  constructor(id) {
    this.id = id;
    this.players = [];
    this.game = null;
    this.hostId = null;
    this.chat = [];
  }
  addPlayer(player) {
    if (this.players.length >= 8) return false;
    if (this.players.find(p => p.name === player.name)) return false;
    this.players.push(player);
    if (!this.hostId) this.hostId = player.id;
    return true;
  }
  removePlayer(socketId) {
    const idx = this.players.findIndex(p => p.socketId === socketId);
    if (idx === -1) return null;
    const p = this.players.splice(idx, 1)[0];
    if (this.hostId === p.id && this.players.length) this.hostId = this.players[0].id;
    return p;
  }
  getPublicState() {
    return {
      id: this.id,
      players: this.players.map(p => ({ id: p.id, name: p.name, color: p.color, ready: p.ready })),
      hostId: this.hostId,
      inGame: !!this.game,
      chat: this.chat.slice(-30)
    };
  }
}

class Game {
  constructor(room) {
    this.room = room;
    this.phase = 'setup';
    this.currentPlayerId = null;
    this.areas = shuffle([...AREAS]);
    this.pairs = [
      [this.areas[0].id, this.areas[1].id],
      [this.areas[2].id, this.areas[3].id],
      [this.areas[4].id, this.areas[5].id]
    ];
    this.numberToArea = {};
    this.areas.forEach(a => a.numbers.forEach(n => { this.numberToArea[n] = a.id; }));
    this.whiteDeck = createDeck(WHITE_CARDS);
    this.blackDeck = createDeck(BLACK_CARDS);
    this.hermitDeck = createDeck(HERMIT_CARDS);
    this.whiteDiscard = [];
    this.blackDiscard = [];
    this.hermitDiscard = [];
    this.players = [];
    this.log = [];
    this.winners = [];
    this.firstDeath = null;
    this.deathCount = 0;
    this.pending = null;
  }

  initPlayers() {
    const n = this.room.players.length;
    const counts = ROLE_COUNTS[n] || ROLE_COUNTS[6];
    const byFaction = { Shadow: [], Hunter: [], Neutral: [] };
    Object.values(CHARACTERS).forEach(c => byFaction[c.faction].push(c));
    const pool = [];
    ['Shadow', 'Hunter', 'Neutral'].forEach(f => {
      const sh = shuffle(byFaction[f]);
      for (let i = 0; i < counts[f]; i++) if (sh[i]) pool.push(sh[i]);
    });
    const chars = shuffle(pool);
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#e91e63'];
    this.players = this.room.players.map((rp, i) => ({
      id: rp.id, name: rp.name, color: colors[i % colors.length], socketId: rp.socketId,
      character: chars[i].name, faction: chars[i].faction, maxHp: chars[i].hp,
      damage: 0, alive: true, revealed: false, location: null, equipment: [],
      abilityUsed: false, protected: false, abilityDisabled: false, isCurrent: false,
      hasMovedThisTurn: false, hasAreaActionThisTurn: false, hasAttackedThisTurn: false,
      hand: [], extraTurn: false
    }));
    this.currentPlayerId = this.players[0].id;
    this.players[0].isCurrent = true;
    this.phase = 'playing';
    this.addLog(`Bắt đầu game (${n} người). Thứ tự: ${this.players.map(p => p.name).join(' → ')}`);
  }

  getPlayer(id) { return this.players.find(p => p.id === id); }

  nextTurn() {
    const alive = this.players.filter(p => p.alive);
    if (!alive.length) return;
    let idx = this.players.findIndex(p => p.id === this.currentPlayerId);
    if (idx < 0) idx = 0;
    let nextIdx = idx;
    for (let i = 0; i < this.players.length; i++) {
      nextIdx = (nextIdx + 1) % this.players.length;
      if (this.players[nextIdx].alive) break;
    }
    this.players.forEach(p => { p.isCurrent = false; });
    this.currentPlayerId = this.players[nextIdx].id;
    this.players[nextIdx].isCurrent = true;
    this.players[nextIdx].protected = false;
    this.players[nextIdx].hasMovedThisTurn = false;
    this.players[nextIdx].hasAreaActionThisTurn = false;
    this.players[nextIdx].hasAttackedThisTurn = false;
    this.addLog(`--- ${this.players[nextIdx].name} đến lượt ---`);
    if (this.players[nextIdx].character === 'Catherine' && !this.players[nextIdx].abilityDisabled) {
      this.heal(this.players[nextIdx], 1);
      this.addLog(`${this.players[nextIdx].name} hồi 1 máu (Stigmata).`);
    }
  }

  addLog(msg) {
    this.log.push({ t: Date.now(), msg });
    if (this.log.length > 80) this.log.shift();
  }

  getPublicState(forPlayerId) {
    return {
      phase: this.phase, areas: this.areas, pairs: this.pairs, numberToArea: this.numberToArea,
      currentPlayerId: this.currentPlayerId,
      players: this.players.map(p => ({
        id: p.id, name: p.name, color: p.color, damage: p.damage, maxHp: p.maxHp,
        alive: p.alive, revealed: p.revealed, location: p.location, equipment: p.equipment,
        isCurrent: p.isCurrent, protected: p.protected, abilityDisabled: p.abilityDisabled,
        character: (p.id === forPlayerId || p.revealed) ? p.character : null,
        faction: (p.id === forPlayerId || p.revealed) ? p.faction : null,
        abilityUsed: p.id === forPlayerId ? p.abilityUsed : undefined,
        hasMovedThisTurn: p.id === forPlayerId ? p.hasMovedThisTurn : undefined,
        hasAreaActionThisTurn: p.id === forPlayerId ? p.hasAreaActionThisTurn : undefined,
        hasAttackedThisTurn: p.id === forPlayerId ? p.hasAttackedThisTurn : undefined,
        hand: p.id === forPlayerId ? p.hand : undefined
      })),
      log: this.log.slice(-35), winners: this.winners,
      pending: this.pending && this.pending.playerId === forPlayerId ? this.pending : null,
      myId: forPlayerId
    };
  }
    move(playerId, forceAreaId) {
    const p = this.getPlayer(playerId);
    if (!p || !p.alive || p.id !== this.currentPlayerId) return { ok: false, err: 'Chưa đến lượt bạn' };
    if (this.pending) return { ok: false, err: 'Hãy xử lý hành động đang chờ trước' };
    if (p.hasMovedThisTurn) return { ok: false, err: 'Bạn đã di chuyển trong lượt này' };

    let areaId = forceAreaId;
    let rolls = null;
    if (!forceAreaId) {
      const d6 = rollD6(), d4 = rollD4(), total = d6 + d4;
      rolls = { d6, d4, total };
      if (total === 7) return { ok: true, needChoose: true, rolls, type: 'any' };
      areaId = this.numberToArea[total];
      if (p.location === areaId) {
        this.addLog(`${p.name} tung ${d6}+${d4}=${total} trùng ô → tung lại`);
        return this.move(playerId);
      }
    } else {
      if (p.location === forceAreaId) return { ok: false, err: 'Phải chuyển sang vùng khác' };
    }

    p.location = areaId;
    p.hasMovedThisTurn = true;
    const area = this.areas.find(a => a.id === areaId);
    this.addLog(`${p.name} → ${area?.name || areaId} ${rolls ? `(${rolls.d6}+${rolls.d4}=${rolls.total})` : ''}`);
    return { ok: true, rolls, areaId, areaName: area?.name };
  }

  areaAction(playerId) {
    const p = this.getPlayer(playerId);
    if (!p || !p.alive || p.id !== this.currentPlayerId) return { ok: false, err: 'Chưa đến lượt bạn' };
    if (!p.hasMovedThisTurn) return { ok: false, err: 'Phải di chuyển trước' };
    if (p.hasAreaActionThisTurn) return { ok: false, err: 'Đã dùng hành động vùng trong lượt này' };
    const area = this.areas.find(a => a.id === p.location);
    if (!area) return { ok: false, err: 'Chưa ở vùng nào' };

    if (area.action === 'hermit') {
      if (!this.hermitDeck.length) { this.hermitDeck = createDeck(this.hermitDiscard); this.hermitDiscard = []; }
      const card = this.hermitDeck.pop();
      p.hasAreaActionThisTurn = true;
      this.pending = { type: 'hermit_give', playerId, card, msg: 'Chọn người để đưa thẻ Hermit' };
      this.addLog(`${p.name} rút thẻ Hermit.`);
      return { ok: true, pending: true, card };
    }
    if (area.action === 'white') return this.drawCard(p, 'white');
    if (area.action === 'black') return this.drawCard(p, 'black');
    if (area.action === 'underworld') {
      p.hasAreaActionThisTurn = true;
      this.pending = { type: 'choose_deck', playerId, msg: 'Chọn bộ thẻ: Trắng / Đen / Hermit' };
      return { ok: true, pending: true };
    }
    if (area.action === 'weird') {
      p.hasAreaActionThisTurn = true;
      this.pending = { type: 'weird', playerId, msg: 'Hồi 1 máu HOẶC gây 2 sát thương — chọn mục tiêu' };
      return { ok: true, pending: true };
    }
    if (area.action === 'altar') {
      p.hasAreaActionThisTurn = true;
      this.pending = { type: 'steal_equip', playerId, msg: 'Chọn người để cướp trang bị' };
      return { ok: true, pending: true };
    }
    return { ok: false };
  }

  drawCard(p, color) {
    p.hasAreaActionThisTurn = true;
    let deck = color === 'white' ? this.whiteDeck : this.blackDeck;
    let discard = color === 'white' ? this.whiteDiscard : this.blackDiscard;
    if (!deck.length) {
      deck = createDeck(discard);
      if (color === 'white') { this.whiteDeck = deck; this.whiteDiscard = []; }
      else { this.blackDeck = deck; this.blackDiscard = []; }
    }
    const card = deck.pop();
    const colorName = color === 'white' ? 'Trắng' : 'Đen';
    this.addLog(`${p.name} rút thẻ ${colorName}: ${card.name}`);
    if (card.type === 'equip') {
      p.equipment.push(card);
      this.checkDavidWin(p);
      this.pending = {
        type: 'show_card', playerId: p.id, card, color, equipped: true,
        msg: `Trang bị: ${card.name} — ${card.desc}`
      };
      return { ok: true, card, equipped: true, pending: true };
    }
    if (!p.hand) p.hand = [];
    p.hand.push(card);
    this.pending = {
      type: 'show_card', playerId: p.id, card, color, inHand: true,
      msg: `${card.name}: ${card.desc}`
    };
    return { ok: true, card, inHand: true, pending: true };
  }

  attack(playerId, targetId) {
    const p = this.getPlayer(playerId), t = this.getPlayer(targetId);
    if (!p || !p.alive || p.id !== this.currentPlayerId) return { ok: false, err: 'Chưa đến lượt bạn' };
    if (!p.hasMovedThisTurn) return { ok: false, err: 'Phải di chuyển trước khi tấn công' };
    if (p.hasAttackedThisTurn) return { ok: false, err: 'Mỗi lượt chỉ được tấn công 1 lần' };
    if (!t || !t.alive) return { ok: false, err: 'Mục tiêu không hợp lệ' };
    if (this.pending) return { ok: false, err: 'Hãy xử lý hành động đang chờ' };
    const myPair = this.pairs.find(pr => pr.includes(p.location));
    const hasHandgun = p.equipment.some(e => e.effect === 'handgun');
    let inRange = hasHandgun
      ? (t.location !== p.location && !(myPair && myPair.includes(t.location)))
      : (myPair && myPair.includes(t.location));
    if (!inRange) return { ok: false, err: 'Ngoài tầm tấn công' };
    let dmg = 0, rolls = {};
    const valk = p.character === 'Valkyrie' && p.revealed && !p.abilityDisabled;
    const masa = p.equipment.some(e => e.effect === 'masamune' || e.effect === 'cursed_sword');
    if (valk || (masa && p.equipment.some(e => e.effect === 'masamune'))) {
      const d4 = rollD4(); dmg = d4; rolls = { d4 };
    } else {
      const d6 = rollD6(), d4 = rollD4(); dmg = Math.abs(d6 - d4); rolls = { d6, d4 };
    }
    p.equipment.forEach(e => {
      if (e.effect === 'plus1' && dmg > 0) dmg++;
      if (e.effect === 'cursed_sword' && dmg > 0) dmg++;
      if (e.effect === 'spear' && p.revealed && p.faction === 'Hunter' && dmg > 0) dmg += 2;
      if (e.effect === 'spear_traitor' && dmg > 0) {
        if (p.revealed) dmg += 1;
        else this.applyDamage(p, 1);
      }
      if (e.effect === 'robe' && dmg > 0) dmg = Math.max(0, dmg - 1);
    });
    t.equipment.forEach(e => { if (e.effect === 'robe' && dmg > 0) dmg = Math.max(0, dmg - 1); });
    if (t.protected) dmg = 0;
    this.addLog(`${p.name} tấn công ${t.name} → ${dmg} sát thương ${JSON.stringify(rolls)}`);
    if (p.character === 'Bob' && p.revealed && !p.abilityDisabled && dmg >= 2 && t.equipment.length) {
      this.pending = { type: 'bob_robbery', playerId: p.id, targetId: t.id, damage: dmg, msg: 'Cướp trang bị thay vì gây sát thương?' };
      return { ok: true, pending: true, rolls, damage: dmg };
    }
    this.applyDamage(t, dmg, p);
    p.hasAttackedThisTurn = true;
    if (p.character === 'Vampire' && p.revealed && !p.abilityDisabled && dmg > 0) {
      this.heal(p, 2); this.addLog(`${p.name} hồi 2 máu (Vampire).`);
    }
    return { ok: true, rolls, damage: dmg };
  }

  applyDamage(target, amount, attacker) {
    if (!target.alive || amount <= 0) return;
    if (target.protected) { this.addLog(`${target.name} được bảo vệ.`); return; }
    target.damage += amount;
    this.addLog(`${target.name} nhận ${amount} sát thương (${target.damage}/${target.maxHp})`);
    if (target.damage >= target.maxHp) this.kill(target, attacker);
  }
  heal(player, amount) { if (player.alive) player.damage = Math.max(0, player.damage - amount); }

  kill(victim, killer) {
    if (!victim.alive) return;
    victim.alive = false; victim.revealed = true; this.deathCount++;
    if (!this.firstDeath) this.firstDeath = victim.id;
    this.addLog(`${victim.name} (${victim.character}/${victim.faction}) đã bị loại!`);
    this.players.forEach(p => {
      if (p.alive && p.character === 'Daniel' && !p.revealed) {
        p.revealed = true; this.addLog(`${p.name} (Daniel) phải tiết lộ nhân vật!`);
      }
    });
    if (killer && killer.alive && victim.equipment.length) {
      const hasRosary = killer.equipment.some(e => e.effect === 'rosary');
      if (hasRosary) {
        killer.equipment.push(...victim.equipment);
        this.addLog(`${killer.name} lấy hết trang bị (Tràng hạt bạc).`);
      } else {
        const eq = victim.equipment.pop();
        killer.equipment.push(eq);
        this.addLog(`${killer.name} lấy ${eq.name}.`);
      }
      victim.equipment = []; this.checkDavidWin(killer);
    }
    this.players.forEach(p => {
      if (p.alive && p.character === 'David' && p.revealed && !p.abilityDisabled && victim.equipment.length) {
        const eq = victim.equipment.pop(); p.equipment.push(eq);
        this.addLog(`${p.name} (David) lấy ${eq.name}.`); this.checkDavidWin(p);
      }
    });
    if (killer && killer.character === 'Charles' && killer.revealed && !killer.abilityDisabled) {
      this.applyDamage(killer, 2); this.addLog(`${killer.name} (Charles) nhận 2 sát thương.`);
    }
    if (killer && killer.character === 'Bryan' && !killer.revealed && victim.maxHp >= 13) {
      killer.revealed = true; this.addLog(`${killer.name} (Bryan) phải tiết lộ nhân vật.`);
    }
    this.checkWinConditions();
  }

  checkDavidWin(p) {
    if (p.character !== 'David' || !p.alive) return;
    if (p.equipment.filter(e => e.holy).length >= 3) {
      this.winners = [p.id]; this.phase = 'ended';
      this.addLog(`${p.name} (David) thắng với 3 trang bị Thánh!`);
    }
  }

  checkWinConditions() {
    if (this.phase === 'ended') return;
    const alive = this.players.filter(p => p.alive);
    const dead = this.players.filter(p => !p.alive);
    const shadowsAlive = alive.filter(p => p.faction === 'Shadow').length;
    const huntersAlive = alive.filter(p => p.faction === 'Hunter').length;
    const neutralsDead = dead.filter(p => p.faction === 'Neutral').length;
    const winners = new Set();
    if (huntersAlive === 0) this.players.filter(p => p.faction === 'Shadow').forEach(p => winners.add(p.id));
    if (shadowsAlive === 0) this.players.filter(p => p.faction === 'Hunter').forEach(p => winners.add(p.id));
    if (neutralsDead >= 3) this.players.filter(p => p.faction === 'Shadow').forEach(p => winners.add(p.id));
    this.players.forEach(p => {
      if (p.character === 'Allie' && p.alive && (shadowsAlive === 0 || huntersAlive === 0 || neutralsDead >= 3)) winners.add(p.id);
      if (p.character === 'Bob' && p.alive && p.equipment.length >= 5) winners.add(p.id);
      if (p.character === 'Daniel' && (this.firstDeath === p.id || (p.alive && shadowsAlive === 0))) winners.add(p.id);
      if (p.character === 'Catherine' && (this.firstDeath === p.id || (p.alive && alive.length <= 2))) winners.add(p.id);
      if (p.character === 'Bryan' && p.alive) {
        const church = this.areas.find(a => a.action === 'white');
        if (p.location === church?.id && (shadowsAlive === 0 || huntersAlive === 0)) winners.add(p.id);
      }
    });
    if (winners.size) {
      this.winners = [...winners]; this.phase = 'ended';
      this.addLog(`🎉 Người thắng: ${this.winners.map(id => {
        const pl = this.getPlayer(id); return `${pl.name}(${pl.character})`;
      }).join(', ')}`);
    }
  }

  endTurn(playerId) {
    const p = this.getPlayer(playerId);
    if (!p || p.id !== this.currentPlayerId) return { ok: false, err: 'Chưa đến lượt bạn' };
    if (this.pending) return { ok: false, err: 'Hãy xử lý hành động đang chờ' };
    if (!p.hasMovedThisTurn) return { ok: false, err: 'Phải di chuyển trước khi kết thúc lượt' };
    if (p.character === 'Wight' && p.revealed && !p.abilityUsed && !p.abilityDisabled) {
      this.pending = { type: 'wight_extra', playerId: p.id, msg: 'Đi thêm 1 lượt (Wight)?' };
      return { ok: true, pending: true };
    }
    if (p.extraTurn) {
      p.extraTurn = false;
      p.hasMovedThisTurn = false;
      p.hasAreaActionThisTurn = false;
      p.hasAttackedThisTurn = false;
      this.addLog(`${p.name} lượt thêm (Điên loạn)`);
      return { ok: true };
    }
    this.nextTurn();
    return { ok: true };
  }

  reveal(playerId) {
    const p = this.getPlayer(playerId);
    if (!p || !p.alive) return { ok: false };
    p.revealed = true;
    this.addLog(`${p.name} tiết lộ nhân vật: ${p.character} (${p.faction})`);
    return { ok: true };
  }
    useAbility(playerId, data) {
    const p = this.getPlayer(playerId);
    if (!p || !p.alive || p.abilityDisabled) return { ok: false, err: 'Không dùng được' };
    const ch = CHARACTERS[p.character];
    if (ch && ch.revealRequired && !p.revealed) {
      p.revealed = true; this.addLog(`${p.name} tiết lộ để dùng kỹ năng.`);
    }
    switch (p.character) {
      case 'Allie':
        if (p.abilityUsed) return { ok: false }; p.damage = 0; p.abilityUsed = true;
        this.addLog(`${p.name} hồi đầy máu (Mother's Love)`); break;
      case 'Franklin': {
        if (p.abilityUsed || !p.isCurrent) return { ok: false };
        const t = this.getPlayer(data.targetId); if (!t) return { ok: false };
        const d = rollD6(); this.applyDamage(t, d, p); p.abilityUsed = true;
        this.addLog(`${p.name} Sét đánh ${d}`); break;
      }
      case 'George': {
        if (p.abilityUsed || !p.isCurrent) return { ok: false };
        const t = this.getPlayer(data.targetId); if (!t) return { ok: false };
        const d = rollD4(); this.applyDamage(t, d, p); p.abilityUsed = true;
        this.addLog(`${p.name} Phá hủy ${d}`); break;
      }
      case 'Fu-ka': {
        if (p.abilityUsed || !p.isCurrent) return { ok: false };
        const t = this.getPlayer(data.targetId); if (!t) return { ok: false };
        t.damage = 7; if (t.damage >= t.maxHp) this.kill(t, p); p.abilityUsed = true;
        this.addLog(`${p.name} đặt ${t.name} về 7 sát thương`); break;
      }
      case 'Ellen': {
        if (p.abilityUsed || !p.isCurrent) return { ok: false };
        const t = this.getPlayer(data.targetId); if (!t) return { ok: false };
        t.abilityDisabled = true; p.abilityUsed = true;
        this.addLog(`${p.name} xóa kỹ năng của ${t.name}`); break;
      }
      case 'Gregor':
        if (p.abilityUsed) return { ok: false }; p.protected = true; p.abilityUsed = true;
        this.addLog(`${p.name} bật Khiên bảo vệ`); break;
      case 'Ultra Soul': {
        if (!p.isCurrent) return { ok: false };
        const und = this.areas.find(a => a.action === 'underworld');
        const t = this.getPlayer(data.targetId);
        if (t && t.location === und?.id) this.applyDamage(t, 1, p);
        this.addLog(`${p.name} Tia sát nhân`); break;
      }
      default: return { ok: false, err: 'Không có kỹ năng' };
    }
    this.checkWinConditions();
    return { ok: true };
  }

  useHandCard(playerId, data) {
    const p = this.getPlayer(playerId);
    if (!p || !p.alive) return { ok: false, err: 'Không hợp lệ' };
    if (p.id !== this.currentPlayerId) return { ok: false, err: 'Chỉ dùng thẻ trong lượt của bạn' };
    if (this.pending) return { ok: false, err: 'Hãy xử lý hành động đang chờ trước' };
    const cardId = data.cardId;
    const idx = (p.hand || []).findIndex(c => c.id === cardId);
    if (idx < 0) return { ok: false, err: 'Không có thẻ này trong tay' };
    const card = p.hand[idx];
    p.hand.splice(idx, 1);
    this.addLog(`${p.name} dùng thẻ: ${card.name}`);
    this.pending = {
      type: 'resolve_card', playerId: p.id, card, color: card.id.startsWith('w') ? 'white' : 'black',
      msg: `${card.name}: ${card.desc}`
    };
    return { ok: true, pending: true, card };
  }

  resolvePending(playerId, data) {
    if (!this.pending || this.pending.playerId !== playerId) return { ok: false, err: 'Không có hành động chờ' };
    const p = this.getPlayer(playerId);
    const type = this.pending.type;
    if (type === 'show_card') {
      const card = this.pending.card;
      if (data && data.useNow && this.pending.inHand) {
        const hi = (p.hand || []).findIndex(c => c.id === card.id);
        if (hi >= 0) p.hand.splice(hi, 1);
        this.pending = {
          type: 'resolve_card', playerId: p.id, card,
          color: this.pending.color,
          msg: `${card.name}: ${card.desc}`
        };
        return { ok: true, pending: true };
      }
      this.pending = null;
      return { ok: true };
    }
    if (type === 'hermit_give') {
      const target = this.getPlayer(data.targetId);
      if (!target || !target.alive) return { ok: false, err: 'Không hợp lệ' };
      this.resolveHermit(target, this.pending.card, p);
      this.hermitDiscard.push(this.pending.card);
      this.pending = null;
      return { ok: true };
    }
    if (type === 'choose_deck') {
      const color = data.deck;
      this.pending = null;
      if (color === 'hermit') {
        if (!this.hermitDeck.length) { this.hermitDeck = createDeck(this.hermitDiscard); this.hermitDiscard = []; }
        const card = this.hermitDeck.pop();
        this.pending = { type: 'hermit_give', playerId, card, msg: 'Chọn người để đưa thẻ Hermit' };
        return { ok: true, pending: true, card };
      }
      return this.drawCard(p, color);
    }
    if (type === 'weird') {
      const target = this.getPlayer(data.targetId) || p;
      if (data.action === 'heal') { this.heal(target, 1); this.addLog(`${p.name} hồi 1 máu cho ${target.name}`); }
      else { this.applyDamage(target, 2, p); this.addLog(`${p.name} gây 2 sát thương cho ${target.name}`); }
      this.pending = null; return { ok: true };
    }
    if (type === 'steal_equip') {
      const target = this.getPlayer(data.targetId);
      if (target && target.equipment.length) {
        const eq = target.equipment.pop(); p.equipment.push(eq);
        this.addLog(`${p.name} cướp ${eq.name}`); this.checkDavidWin(p);
      }
      this.pending = null; return { ok: true };
    }
    if (type === 'resolve_card') {
      this.resolveSingleCard(p, this.pending.card, data || {});
      this.pending = null; return { ok: true };
    }
    if (type === 'bob_robbery') {
      if (data.steal) {
        const t = this.getPlayer(this.pending.targetId);
        if (t.equipment.length) {
          const eq = t.equipment.pop(); p.equipment.push(eq);
          this.addLog(`${p.name} (Bob) cướp ${eq.name}`); this.checkDavidWin(p);
        }
      } else {
        this.applyDamage(this.getPlayer(this.pending.targetId), this.pending.damage, p);
      }
      p.hasAttackedThisTurn = true;
      this.pending = null; return { ok: true };
    }
    if (type === 'wight_extra') {
      if (data.extra) {
        p.abilityUsed = true;
        p.hasMovedThisTurn = false;
        p.hasAreaActionThisTurn = false;
        p.hasAttackedThisTurn = false;
        this.addLog(`${p.name} đi thêm 1 lượt (Wight)`);
      } else this.nextTurn();
      this.pending = null; return { ok: true };
    }
    this.pending = null; return { ok: true };
  }

  resolveHermit(target, card, giver) {
    const faction = target.faction, hp = target.maxHp;
    let matches = false;
    const FEMALE = ['Allie', 'Emi', 'Catherine', 'Vampire'];
    if (card.test === 'any') matches = true;
    else if (card.test === 'Shadow') matches = faction === 'Shadow';
    else if (card.test === 'Hunter') matches = faction === 'Hunter';
    else if (card.test === 'Neutral') matches = faction === 'Neutral';
    else if (card.test === 'Hunter|Neutral') matches = faction === 'Hunter' || faction === 'Neutral';
    else if (card.test === 'Shadow|Neutral') matches = faction === 'Shadow' || faction === 'Neutral';
    else if (card.test === 'Hunter|Shadow') matches = faction === 'Hunter' || faction === 'Shadow';
    else if (card.test === 'hp_le_11') matches = hp <= 11;
    else if (card.test === 'hp_ge_12') matches = hp >= 12;
    else if (card.test === 'hp_ge_11') matches = hp >= 11;
    else if (card.test === 'hp_le_10') matches = hp <= 10;
    else if (card.test === 'hp_lt_12') matches = hp < 12;
    else if (card.test === 'female') matches = FEMALE.includes(target.character);
    else if (card.test === 'not_shadow') matches = faction !== 'Shadow';
    if (target.character === 'Unknown' && !target.abilityDisabled && String(card.effect).startsWith('damage')) {
      this.addLog(`${target.name} Hermit → Không có gì xảy ra (Unknown)`); return;
    }
    if (!matches) { this.addLog(`${target.name} Hermit → Không có gì xảy ra`); return; }
    if (card.effect === 'damage_1') this.applyDamage(target, 1, giver);
    else if (card.effect === 'damage_2') this.applyDamage(target, 2, giver);
    else if (card.effect === 'heal_1_or_damage') {
      if (target.damage === 0) this.applyDamage(target, 1, giver); else this.heal(target, 1);
    } else if (card.effect === 'equip_or_damage_1') {
      if (target.equipment.length) {
        const eq = target.equipment.pop(); giver.equipment.push(eq);
        this.addLog(`${target.name} đưa ${eq.name}`);
      } else this.applyDamage(target, 1, giver);
    } else if (card.effect === 'reveal_faction') this.addLog(`${target.name} phe: ${target.faction}`);
  }

  resolveSingleCard(p, card, data) {
    data = data || {};
    switch (card.effect) {
      case 'advent':
        if (p.faction === 'Hunter') { p.revealed = true; p.damage = 0; this.addLog(`${p.name} Hồi sinh (Hunter)`); }
        else this.addLog(`${p.name} Advent: không phải Hunter — vô hiệu`);
        break;
      case 'chocolate':
        if (['Allie', 'Emi', 'Unknown'].includes(p.character)) {
          p.revealed = true; p.damage = 0; this.addLog(`${p.name} Sô-cô-la hồi đầy`);
        } else this.addLog(`${p.name} Sô-cô-la: không đúng nhân vật — vô hiệu`);
        break;
      case 'blessing': {
        const t = this.getPlayer(data.targetId);
        if (t && t.id !== p.id) {
          const d = rollD6(); this.heal(t, d);
          this.addLog(`${p.name} Phước lành → ${t.name} hồi ${d}`);
        }
        break;
      }
      case 'first_aid': {
        const t = this.getPlayer(data.targetId) || p;
        t.damage = 7;
        if (t.damage >= t.maxHp) this.kill(t, p);
        this.addLog(`${p.name} Sơ cứu → ${t.name} sát thương = 7`);
        break;
      }
      case 'holy_water': this.heal(p, 2); this.addLog(`${p.name} Nước thánh hồi 2`); break;
      case 'concealed': this.addLog(`${p.name} Tri thức ẩn (đổi khu vực)`); break;
      case 'guardian': p.protected = true; this.addLog(`${p.name} Thiên thần hộ mệnh`); break;
      case 'disenchant': {
        const t = this.getPlayer(data.targetId);
        if (t && t.faction === 'Shadow' && !t.revealed) {
          t.revealed = true; this.addLog(`${t.name} bị Gương buộc lộ (Shadow)`);
        }
        break;
      }
      case 'banana': {
        if (p.equipment.length) {
          const t = this.getPlayer(data.targetId);
          if (t) {
            const eq = p.equipment.pop(); t.equipment.push(eq);
            this.addLog(`${p.name} đưa ${eq.name} cho ${t.name}`);
          }
        } else {
          this.applyDamage(p, 1); this.addLog(`${p.name} Vỏ chuối: không có trang bị → 1 sát thương`);
        }
        break;
      }
      case 'spider': {
        const t = this.getPlayer(data.targetId);
        if (t) this.applyDamage(t, 2, p);
        this.applyDamage(p, 2);
        break;
      }
      case 'diabolic':
        if (p.faction === 'Shadow') { p.revealed = true; p.damage = 0; this.addLog(`${p.name} Nghi thức quỷ hồi đầy`); }
        else this.addLog(`${p.name} Nghi thức: không phải Shadow`);
        break;
      case 'dynamite': {
        const total = rollD6() + rollD4();
        this.addLog(`Thuốc nổ: ${total}`);
        const areaId = this.numberToArea[total];
        if (areaId != null) {
          this.players.filter(pl => pl.alive && pl.location === areaId)
            .forEach(pl => this.applyDamage(pl, 3, p));
        }
        break;
      }
      case 'bat': {
        const t = this.getPlayer(data.targetId);
        if (t) { this.applyDamage(t, 2, p); this.heal(p, 1); }
        break;
      }
      case 'doll': {
        const t = this.getPlayer(data.targetId);
        const d = rollD6();
        if (d <= 4) { if (t) this.applyDamage(t, 3, p); this.addLog(`Búp bê D6=${d} → ${t?.name} nhận 3`); }
        else { this.applyDamage(p, 3); this.addLog(`Búp bê D6=${d} → ${p.name} nhận 3`); }
        break;
      }
      case 'madness':
        p.extraTurn = true;
        this.addLog(`${p.name} Điên loạn: thêm 1 lượt sau khi kết thúc`);
        break;
      case 'heal_self_full': p.damage = 0; break;
      case 'heal_any_2': { const t = this.getPlayer(data.targetId) || p; this.heal(t, 2); break; }
      case 'protect_turn': p.protected = true; break;
      case 'damage_2_any': { const t = this.getPlayer(data.targetId); if (t) this.applyDamage(t, 2, p); break; }
      case 'damage_2_heal1': { const t = this.getPlayer(data.targetId); if (t) { this.applyDamage(t, 2, p); this.heal(p, 1); } break; }
    }
    if (card.type === 'single') {
      if (String(card.id).startsWith('w')) this.whiteDiscard.push(card);
      else this.blackDiscard.push(card);
    }
    this.checkWinConditions();
  }
}

io.on('connection', (socket) => {
  console.log('Kết nối:', socket.id);

  socket.on('create_room', ({ name }, cb) => {
    const roomId = uuidv4().slice(0, 6).toUpperCase();
    const room = new Room(roomId);
    const player = { id: uuidv4(), name: name || 'Người chơi', color: '#3498db', socketId: socket.id, ready: false };
    room.addPlayer(player);
    rooms[roomId] = room;
    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerId = player.id;
    cb && cb({ ok: true, roomId, playerId: player.id, state: room.getPublicState() });
    io.to(roomId).emit('room_update', room.getPublicState());
  });

  socket.on('join_room', ({ roomId, name }, cb) => {
    const room = rooms[(roomId || '').toUpperCase()];
    if (!room) return cb && cb({ ok: false, err: 'Không tìm thấy phòng' });
    if (room.game) return cb && cb({ ok: false, err: 'Game đã bắt đầu' });
    const player = { id: uuidv4(), name: name || 'Người chơi', color: '#2ecc71', socketId: socket.id, ready: false };
    if (!room.addPlayer(player)) return cb && cb({ ok: false, err: 'Không vào được phòng' });
    socket.join(room.id);
    socket.roomId = room.id;
    socket.playerId = player.id;
    cb && cb({ ok: true, roomId: room.id, playerId: player.id, state: room.getPublicState() });
    io.to(room.id).emit('room_update', room.getPublicState());
  });

  socket.on('leave_room', () => {
    const room = rooms[socket.roomId];
    if (!room) { socket.emit('left_room'); return; }
    room.removePlayer(socket.id);
    socket.leave(socket.roomId);
    const oldRoom = socket.roomId;
    socket.roomId = null;
    socket.playerId = null;
    if (!room.players.length) delete rooms[oldRoom];
    else {
      io.to(oldRoom).emit('room_update', room.getPublicState());
      if (room.game) {
        room.game.players.forEach(gp => {
          if (gp.socketId) io.to(gp.socketId).emit('game_update', room.game.getPublicState(gp.id));
        });
      }
    }
    socket.emit('left_room');
  });

  socket.on('chat', ({ msg }) => {
    const room = rooms[socket.roomId];
    if (!room) return;
    const p = room.players.find(pl => pl.id === socket.playerId);
    const entry = { name: p?.name || '?', msg, t: Date.now() };
    room.chat.push(entry);
    io.to(room.id).emit('chat', entry);
  });

  socket.on('start_game', () => {
    const room = rooms[socket.roomId];
    if (!room || room.hostId !== socket.playerId) return;
    if (room.players.length < 4) { socket.emit('error_msg', 'Cần ít nhất 4 người chơi'); return; }
    room.game = new Game(room);
    room.game.initPlayers();
    room.game.players.forEach(gp => {
      const rp = room.players.find(r => r.id === gp.id);
      if (rp) gp.socketId = rp.socketId;
    });
    room.game.players.forEach(gp => {
      if (gp.socketId) io.to(gp.socketId).emit('game_start', room.game.getPublicState(gp.id));
    });
  });

  socket.on('play_again', () => {
    const room = rooms[socket.roomId];
    if (!room || room.hostId !== socket.playerId) return;
    if (room.players.length < 4) {
      socket.emit('error_msg', 'Cần ít nhất 4 người để chơi lại');
      return;
    }
    room.game = new Game(room);
    room.game.initPlayers();
    room.game.players.forEach(gp => {
      const rp = room.players.find(r => r.id === gp.id);
      if (rp) gp.socketId = rp.socketId;
    });
    room.game.players.forEach(gp => {
      if (gp.socketId) io.to(gp.socketId).emit('game_start', room.game.getPublicState(gp.id));
    });
  });

  socket.on('game_action', ({ action, data }, cb) => {
    const room = rooms[socket.roomId];
    if (!room || !room.game) return cb && cb({ ok: false, err: 'Chưa có game' });
    const g = room.game, pid = socket.playerId;
    let result = { ok: false };
    try {
      if (action === 'move') {
        result = g.move(pid, data?.areaId);
        if (result.ok && result.rolls) {
          io.to(room.id).emit('dice_roll', {
            playerName: g.getPlayer(pid)?.name || '?',
            d6: result.rolls.d6,
            d4: result.rolls.d4,
            total: result.rolls.total
          });
        }
      } else if (action === 'area_action') result = g.areaAction(pid);
      else if (action === 'attack') result = g.attack(pid, data?.targetId);
      else if (action === 'end_turn') result = g.endTurn(pid);
      else if (action === 'reveal') result = g.reveal(pid);
      else if (action === 'use_ability') result = g.useAbility(pid, data || {});
      else if (action === 'resolve_pending') result = g.resolvePending(pid, data || {});
      else if (action === 'use_hand_card') result = g.useHandCard(pid, data || {});
      else result = { ok: false, err: 'Hành động không hợp lệ' };
    } catch (e) { console.error(e); result = { ok: false, err: e.message }; }
    g.players.forEach(gp => {
      if (gp.socketId) io.to(gp.socketId).emit('game_update', g.getPublicState(gp.id));
    });
    cb && cb(result);
  });

  socket.on('disconnect', () => {
    const room = rooms[socket.roomId];
    if (!room) return;
    room.removePlayer(socket.id);
    if (!room.players.length) delete rooms[socket.roomId];
    else io.to(room.id).emit('room_update', room.getPublicState());
  });
});

server.listen(PORT, () => console.log(`Shadow Hunters → http://localhost:${PORT}`));