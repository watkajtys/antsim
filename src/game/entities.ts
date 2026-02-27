export enum AntState {
  FORAGING,
  RETURNING,
  ATTACKING,
  GUARDING,
}

export enum AntCaste {
  WORKER,
  SOLDIER,
}

export enum TerrainType {
  DIRT,
  ROCK,
  WATER,
}

export enum SpiderState {
  WANDERING,
  HUNTING,
  FIGHTING,
}

export class Caterpillar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number = 0.3;
  wanderAngle: number;
  health: number = 100;
  maxHealth: number = 100;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.wanderAngle = Math.random() * Math.PI * 2;
  }
}

export class Spider {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number = 0.6;
  wanderAngle: number;
  health: number = 300;
  maxHealth: number = 300;
  hunger: number = 0;
  attackCooldown: number = 0;
  state: SpiderState = SpiderState.WANDERING;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.wanderAngle = Math.random() * Math.PI * 2;
  }
}

export class Colony {
  id: number;
  color: string;
  moundX: number;
  moundY: number;
  foodStored: number = 20;
  ants: Ant[] = [];
  homePheromones: number[][];
  foodPheromones: number[][];
  alarmPheromones: number[][];
  activePheromones: Set<number> = new Set();
  cols: number;
  workerRatio: number = 0.8;

  constructor(id: number, color: string, moundX: number, moundY: number, cols: number, rows: number) {
    this.id = id;
    this.color = color;
    this.moundX = moundX;
    this.moundY = moundY;
    this.cols = cols;
    this.homePheromones = Array(cols).fill(0).map(() => Array(rows).fill(0));
    this.foodPheromones = Array(cols).fill(0).map(() => Array(rows).fill(0));
    this.alarmPheromones = Array(cols).fill(0).map(() => Array(rows).fill(0));
  }

  spawnAnt() {
    const currentWorkers = this.ants.filter(a => a.caste === AntCaste.WORKER).length;
    const total = this.ants.length || 1;
    
    let caste = AntCaste.WORKER;
    if (currentWorkers / total > this.workerRatio) {
      caste = AntCaste.SOLDIER;
    }
    this.ants.push(new Ant(this.moundX, this.moundY, this, caste));
  }
}

export class Ant {
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: AntState;
  baseState: AntState;
  caste: AntCaste;
  carryingFood: boolean;
  payload: number = 0;
  speed: number = 1.5;
  wanderAngle: number;
  age: number = 0;
  maxAge: number = 18000 + Math.random() * 12000;
  health: number = 30;
  maxHealth: number = 30;
  attackDamage: number = 0.5;
  colony: Colony;

  constructor(x: number, y: number, colony: Colony, caste: AntCaste = AntCaste.WORKER) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.colony = colony;
    this.caste = caste;
    this.carryingFood = false;
    this.wanderAngle = Math.random() * Math.PI * 2;

    if (caste === AntCaste.SOLDIER) {
      this.maxHealth = 80;
      this.health = 80;
      this.speed = 1.2;
      this.attackDamage = 2.0;
      this.baseState = Math.random() > 0.5 ? AntState.GUARDING : AntState.FORAGING;
    } else {
      this.maxHealth = 15;
      this.health = 15;
      this.speed = 1.5;
      this.attackDamage = 0.1;
      this.baseState = AntState.FORAGING;
    }
    this.state = this.baseState;
  }
}

export class FoodCluster {
  x: number;
  y: number;
  amount: number;

  constructor(x: number, y: number, amount: number) {
    this.x = x;
    this.y = y;
    this.amount = amount;
  }
}
