import { TerrainType, AntState, SpiderState, FoodCluster, Caterpillar, Spider, Colony, Ant, AntCaste } from './entities';

export class Simulation {
  width: number;
  height: number;
  colonies: Colony[] = [];
  foods: FoodCluster[] = [];
  spiders: Spider[] = [];
  caterpillars: Caterpillar[] = [];
  tickCount: number = 0;
  hasSpawnedFirstSpider: boolean = false;

  gridSize: number = 5;
  cols: number;
  rows: number;
  terrain: TerrainType[][];
  
  // Spatial partitioning grid for fast collision checks
  spatialGridSize: number = 50;
  spatialCols: number;
  spatialRows: number;
  spatialGrid: {
    ants: Ant[],
    spiders: Spider[],
    caterpillars: Caterpillar[],
    foods: FoodCluster[]
  }[][];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cols = Math.ceil(width / this.gridSize);
    this.rows = Math.ceil(height / this.gridSize);
    this.terrain = Array(this.cols).fill(0).map(() => Array(this.rows).fill(TerrainType.DIRT));

    this.spatialCols = Math.ceil(width / this.spatialGridSize);
    this.spatialRows = Math.ceil(height / this.spatialGridSize);
    this.spatialGrid = Array(this.spatialCols).fill(0).map(() => 
      Array(this.spatialRows).fill(0).map(() => ({ ants: [], spiders: [], caterpillars: [], foods: [] }))
    );

    // Create player colony
    this.colonies.push(new Colony(0, '#111111', width * 0.5, height * 0.5, this.cols, this.rows)); // Black ants

    this.generateTerrain();

    for (const colony of this.colonies) {
      for (let i = 0; i < 30; i++) {
        colony.spawnAnt();
      }
    }

    for (let i = 0; i < 30; i++) {
      this.spawnFood();
    }

    for (let i = 0; i < 6; i++) {
      this.spawnCaterpillar();
    }
  }

  generateTerrain() {
    const safeRadius = 12; // Safe zone around mound in grid cells

    const addBlob = (type: TerrainType, count: number, maxRadius: number) => {
      for (let i = 0; i < count; i++) {
        let cx = Math.floor(Math.random() * this.cols);
        let cy = Math.floor(Math.random() * this.rows);
        let radius = Math.floor(Math.random() * maxRadius) + 2;

        for (let x = -radius; x <= radius; x++) {
          for (let y = -radius; y <= radius; y++) {
            if (x * x + y * y <= radius * radius) {
              let gx = cx + x;
              let gy = cy + y;
              if (this.isValidGrid(gx, gy)) {
                let safe = true;
                for (const colony of this.colonies) {
                  let moundGridX = Math.floor(colony.moundX / this.gridSize);
                  let moundGridY = Math.floor(colony.moundY / this.gridSize);
                  let dx = gx - moundGridX;
                  let dy = gy - moundGridY;
                  if (Math.sqrt(dx * dx + dy * dy) <= safeRadius) safe = false;
                }
                if (safe && this.terrain[gx][gy] === TerrainType.DIRT) {
                  this.terrain[gx][gy] = type;
                }
              }
            }
          }
        }
      }
    };

    addBlob(TerrainType.ROCK, 15, 5);
    addBlob(TerrainType.WATER, 10, 8);
  }

  spawnFood() {
    let x, y, valid;
    do {
      x = Math.random() * this.width;
      y = Math.random() * this.height;
      let gx = Math.floor(x / this.gridSize);
      let gy = Math.floor(y / this.gridSize);
      valid = gx >= 0 && gx < this.cols && gy >= 0 && gy < this.rows && this.terrain[gx][gy] === TerrainType.DIRT;
    } while (!valid);
    
    this.foods.push(new FoodCluster(x, y, Math.floor(Math.random() * 50) + 20));
  }

  spawnFoodAt(x: number, y: number, amount: number = 50) {
    let gx = Math.floor(x / this.gridSize);
    let gy = Math.floor(y / this.gridSize);
    if (gx >= 0 && gx < this.cols && gy >= 0 && gy < this.rows && this.terrain[gx][gy] === TerrainType.DIRT) {
      this.foods.push(new FoodCluster(x, y, amount));
    }
  }

  spawnCaterpillar() {
    let x, y, valid;
    do {
      if (Math.random() > 0.5) {
        x = Math.random() > 0.5 ? 20 : this.width - 20;
        y = Math.random() * this.height;
      } else {
        x = Math.random() * this.width;
        y = Math.random() > 0.5 ? 20 : this.height - 20;
      }
      let gx = Math.floor(x / this.gridSize);
      let gy = Math.floor(y / this.gridSize);
      valid = gx >= 0 && gx < this.cols && gy >= 0 && gy < this.rows && this.terrain[gx][gy] === TerrainType.DIRT;
    } while (!valid);
    this.caterpillars.push(new Caterpillar(x, y));
  }

  spawnSpider() {
    let x, y, valid;
    do {
      x = Math.random() * this.width;
      y = Math.random() * this.height;
      let gx = Math.floor(x / this.gridSize);
      let gy = Math.floor(y / this.gridSize);
      valid = gx >= 0 && gx < this.cols && gy >= 0 && gy < this.rows && this.terrain[gx][gy] === TerrainType.DIRT;
      
      for (const colony of this.colonies) {
        let dx = x - colony.moundX;
        let dy = y - colony.moundY;
        if (Math.sqrt(dx*dx + dy*dy) < 150) valid = false;
      }
    } while (!valid);
    this.spiders.push(new Spider(x, y));
  }

  isValidGrid(gx: number, gy: number) {
    return gx >= 0 && gx < this.cols && gy >= 0 && gy < this.rows;
  }

  checkObstacle(x: number, y: number, angle: number, lookAhead: number) {
    const nextX = x + Math.cos(angle) * lookAhead;
    const nextY = y + Math.sin(angle) * lookAhead;
    const nextGridX = Math.floor(nextX / this.gridSize);
    const nextGridY = Math.floor(nextY / this.gridSize);

    if (this.isValidGrid(nextGridX, nextGridY)) {
      if (this.terrain[nextGridX][nextGridY] !== TerrainType.DIRT) {
        return true;
      }
    } else {
      return true; // Hit world bounds
    }
    return false;
  }

  keepInBounds(entity: {x: number, y: number, wanderAngle: number}) {
    if (entity.x < 0) { entity.x = 0; entity.wanderAngle = Math.PI - entity.wanderAngle; }
    if (entity.x > this.width) { entity.x = this.width; entity.wanderAngle = Math.PI - entity.wanderAngle; }
    if (entity.y < 0) { entity.y = 0; entity.wanderAngle = -entity.wanderAngle; }
    if (entity.y > this.height) { entity.y = this.height; entity.wanderAngle = -entity.wanderAngle; }
  }

  update() {
    this.tickCount++;
    let allAnts = this.colonies.flatMap(c => c.ants);

    this.rebuildSpatialGrid(allAnts);

    if (!this.hasSpawnedFirstSpider && allAnts.length >= 60) {
      this.hasSpawnedFirstSpider = true;
      this.spawnSpider();
    }

    this.updateColonies();
    this.updatePheromones();
    this.updateCaterpillars();
    this.updateSpiders();
    this.updateAnts();
  }

  rebuildSpatialGrid(allAnts: Ant[]) {
    for (let x = 0; x < this.spatialCols; x++) {
      for (let y = 0; y < this.spatialRows; y++) {
        this.spatialGrid[x][y].ants.length = 0;
        this.spatialGrid[x][y].spiders.length = 0;
        this.spatialGrid[x][y].caterpillars.length = 0;
        this.spatialGrid[x][y].foods.length = 0;
      }
    }

    const addToSpatialGrid = (entity: any, type: 'ants' | 'spiders' | 'caterpillars' | 'foods') => {
      const sx = Math.max(0, Math.min(this.spatialCols - 1, Math.floor(entity.x / this.spatialGridSize)));
      const sy = Math.max(0, Math.min(this.spatialRows - 1, Math.floor(entity.y / this.spatialGridSize)));
      this.spatialGrid[sx][sy][type].push(entity);
    };

    for (const ant of allAnts) addToSpatialGrid(ant, 'ants');
    for (const spider of this.spiders) addToSpatialGrid(spider, 'spiders');
    for (const cat of this.caterpillars) addToSpatialGrid(cat, 'caterpillars');
    for (const food of this.foods) addToSpatialGrid(food, 'foods');
  }

  updateColonies() {
    if (this.tickCount % 60 === 0) {
      for (const colony of this.colonies) {
        colony.foodStored -= colony.ants.length * 0.05;
        
        if (colony.foodStored < 0) {
          colony.foodStored = 0;
          if (colony.ants.length > 0) {
            colony.ants.splice(Math.floor(Math.random() * colony.ants.length), 1);
          }
        } else if (colony.foodStored > 25 && colony.ants.length < 150) {
          let spawnCount = 1;
          if (colony.foodStored > 100) spawnCount = 3;
          else if (colony.foodStored > 50) spawnCount = 2;
          
          for (let i = 0; i < spawnCount; i++) {
            if (colony.ants.length < 150 && colony.foodStored >= 10) {
              colony.foodStored -= 10;
              colony.spawnAnt();
            }
          }
        }
      }
    }
  }

  updatePheromones() {
    // Evaporate pheromones (optimized: run every 5 ticks, clamp to 0 to prevent denormal float slowdowns)
    if (this.tickCount % 5 === 0) {
      for (const colony of this.colonies) {
        for (const index of colony.activePheromones) {
          const x = index % this.cols;
          const y = Math.floor(index / this.cols);
          let keep = false;

          if (colony.homePheromones[x][y] > 0) {
            colony.homePheromones[x][y] *= 0.975;
            if (colony.homePheromones[x][y] < 1) colony.homePheromones[x][y] = 0;
            else keep = true;
          }
          if (colony.foodPheromones[x][y] > 0) {
            colony.foodPheromones[x][y] *= 0.975;
            if (colony.foodPheromones[x][y] < 1) colony.foodPheromones[x][y] = 0;
            else keep = true;
          }
          if (colony.alarmPheromones[x][y] > 0) {
            colony.alarmPheromones[x][y] *= 0.95;
            if (colony.alarmPheromones[x][y] < 1) colony.alarmPheromones[x][y] = 0;
            else keep = true;
          }

          if (!keep) {
            colony.activePheromones.delete(index);
          }
        }
      }
    }
  }

  updateCaterpillars() {
    // Update Caterpillars
    if (this.tickCount % 600 === 0 && this.caterpillars.length < 8) {
      this.spawnCaterpillar();
    }

    for (let i = this.caterpillars.length - 1; i >= 0; i--) {
      const cat = this.caterpillars[i];
      
      if (cat.health <= 0) {
        this.spawnFoodAt(cat.x, cat.y, 100);
        
        // Clear alarm pheromones
        const cgx = Math.floor(cat.x / this.gridSize);
        const cgy = Math.floor(cat.y / this.gridSize);
        for (const colony of this.colonies) {
          for(let ax=-15; ax<=15; ax++) {
            for(let ay=-15; ay<=15; ay++) {
              if (this.isValidGrid(cgx+ax, cgy+ay)) {
                colony.alarmPheromones[cgx+ax][cgy+ay] = 0;
              }
            }
          }
        }

        this.caterpillars.splice(i, 1);
        continue;
      }

      let hitObstacle = this.checkObstacle(cat.x, cat.y, cat.wanderAngle, 12);
      if (hitObstacle) {
        cat.wanderAngle += Math.PI / 2 + (Math.random() * 0.5 - 0.25);
      } else {
        cat.wanderAngle += (Math.random() - 0.5) * 0.1;
      }

      cat.vx = Math.cos(cat.wanderAngle) * cat.speed;
      cat.vy = Math.sin(cat.wanderAngle) * cat.speed;
      cat.x += cat.vx;
      cat.y += cat.vy;
      
      this.keepInBounds(cat);
    }
  }

  updateSpiders() {
    // Update Spiders
    for (let i = this.spiders.length - 1; i >= 0; i--) {
      const spider = this.spiders[i];
      
      if (spider.health <= 0) {
        this.spawnFoodAt(spider.x, spider.y, 200);
        
        // Clear alarm pheromones in a massive radius when the spider dies
        const sgx = Math.floor(spider.x / this.gridSize);
        const sgy = Math.floor(spider.y / this.gridSize);
        for (const colony of this.colonies) {
          for(let ax=-25; ax<=25; ax++) {
            for(let ay=-25; ay<=25; ay++) {
              if (this.isValidGrid(sgx+ax, sgy+ay)) {
                colony.alarmPheromones[sgx+ax][sgy+ay] = 0;
              }
            }
          }
        }

        this.spiders.splice(i, 1);
        setTimeout(() => this.spawnSpider(), 60000);
        continue;
      }

      spider.hunger++;
      if (spider.attackCooldown > 0) spider.attackCooldown--;

      let isSwarmed = false;
      let targetAnt: Ant | null = null;
      let minDist = Infinity;
      let swarmingAnts = 0;

      const sx = Math.max(0, Math.min(this.spatialCols - 1, Math.floor(spider.x / this.spatialGridSize)));
      const sy = Math.max(0, Math.min(this.spatialRows - 1, Math.floor(spider.y / this.spatialGridSize)));
      
      // Check 3x3 spatial grid around spider
      for (let nx = Math.max(0, sx - 1); nx <= Math.min(this.spatialCols - 1, sx + 1); nx++) {
        for (let ny = Math.max(0, sy - 1); ny <= Math.min(this.spatialRows - 1, sy + 1); ny++) {
          for (const ant of this.spatialGrid[nx][ny].ants) {
            const dx = ant.x - spider.x;
            const dy = ant.y - spider.y;
            const dist = dx * dx + dy * dy;
            if (dist < 10000) {
              if (ant.state === AntState.ATTACKING) isSwarmed = true;
              if (dist < minDist) {
                minDist = dist;
                targetAnt = ant;
              }
              if (dist < 400 && ant.state === AntState.ATTACKING) swarmingAnts++;
            }
          }
        }
      }

      spider.speed = Math.max(0.1, 0.6 - (swarmingAnts * 0.15));

      if (isSwarmed) {
        spider.state = SpiderState.FIGHTING;
      } else if (spider.hunger > 600) {
        spider.state = SpiderState.HUNTING;
      } else {
        spider.state = SpiderState.WANDERING;
      }

      let hitObstacle = this.checkObstacle(spider.x, spider.y, spider.wanderAngle, 15);

      if (hitObstacle) {
        spider.wanderAngle += Math.PI / 2 + (Math.random() * 0.5 - 0.25);
      } else {
        if (targetAnt && (spider.state === SpiderState.HUNTING || spider.state === SpiderState.FIGHTING)) {
          const angleToAnt = Math.atan2(targetAnt.y - spider.y, targetAnt.x - spider.x);
          let angleDiff = angleToAnt - spider.wanderAngle;
          while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          spider.wanderAngle += angleDiff * 0.1;

          if (minDist < 400 && spider.attackCooldown <= 0) {
            targetAnt.health -= 15;
            spider.attackCooldown = 60;
            
            if (targetAnt.health > 0) {
              const gx = Math.floor(spider.x / this.gridSize);
              const gy = Math.floor(spider.y / this.gridSize);
              if (this.isValidGrid(gx, gy)) {
                targetAnt.colony.alarmPheromones[gx][gy] = Math.max(targetAnt.colony.alarmPheromones[gx][gy], 150);
                targetAnt.colony.activePheromones.add(gx + gy * this.cols);
                for(let ax=-5; ax<=5; ax++) {
                  for(let ay=-5; ay<=5; ay++) {
                    if (this.isValidGrid(gx+ax, gy+ay)) {
                      const dist = Math.sqrt(ax*ax + ay*ay);
                      if (dist <= 5) {
                        targetAnt.colony.alarmPheromones[gx+ax][gy+ay] = Math.max(targetAnt.colony.alarmPheromones[gx+ax][gy+ay], 150 - (dist * 20));
                        targetAnt.colony.activePheromones.add((gx+ax) + (gy+ay) * this.cols);
                      }
                    }
                  }
                }
              }
            }
          }
        } else {
          spider.wanderAngle += (Math.random() - 0.5) * 0.2;
        }
      }

      spider.vx = Math.cos(spider.wanderAngle) * spider.speed;
      spider.vy = Math.sin(spider.wanderAngle) * spider.speed;
      spider.x += spider.vx;
      spider.y += spider.vy;
      
      this.keepInBounds(spider);
    }
  }

  updateAnts() {
    // Update ants
    for (const colony of this.colonies) {
      for (let i = colony.ants.length - 1; i >= 0; i--) {
        const ant = colony.ants[i];
        
        const gridX = Math.floor(ant.x / this.gridSize);
        const gridY = Math.floor(ant.y / this.gridSize);
        const validGrid = this.isValidGrid(gridX, gridY);

        // Death check
        ant.age++;
        if (ant.age > ant.maxAge || ant.health <= 0) {
          colony.ants.splice(i, 1);
          
          if (ant.carryingFood && ant.payload > 0) {
            this.spawnFoodAt(ant.x, ant.y, ant.payload);
          }

          if (ant.health <= 0 && validGrid) {
            colony.alarmPheromones[gridX][gridY] = 255;
            colony.activePheromones.add(gridX + gridY * this.cols);
            for(let ax=-15; ax<=15; ax++) {
              for(let ay=-15; ay<=15; ay++) {
                if (this.isValidGrid(gridX+ax, gridY+ay)) {
                  const dist = Math.sqrt(ax*ax + ay*ay);
                  if (dist <= 15) {
                    colony.alarmPheromones[gridX+ax][gridY+ay] = Math.max(colony.alarmPheromones[gridX+ax][gridY+ay], 255 - (dist * 12));
                    colony.activePheromones.add((gridX+ax) + (gridY+ay) * this.cols);
                  }
                }
              }
            }
          }
          continue;
        }

        let centerAlarm = validGrid ? colony.alarmPheromones[gridX][gridY] : 0;

        if (centerAlarm > 10 && ant.state !== AntState.ATTACKING) {
          if (ant.caste === AntCaste.WORKER) {
            // Workers flee from alarm pheromones
            ant.wanderAngle += Math.PI;
          } else {
            // Soldiers attack
            ant.state = AntState.ATTACKING;
            if (ant.carryingFood) {
              ant.carryingFood = false;
              this.spawnFoodAt(ant.x, ant.y, ant.payload);
              ant.payload = 0;
            }
          }
        }

        if (ant.state === AntState.ATTACKING) {
          ant.speed = ant.caste === AntCaste.SOLDIER ? 2.0 : 2.5;
        } else if (ant.state === AntState.RETURNING) {
          ant.speed = 2.0;
        } else if (ant.state === AntState.GUARDING) {
          ant.speed = 1.0;
        } else {
          ant.speed = ant.caste === AntCaste.SOLDIER ? 1.2 : 1.5;
        }

        let hitObstacle = this.checkObstacle(ant.x, ant.y, ant.wanderAngle, 8);
        let isSticking = false;

        if (hitObstacle) {
          ant.wanderAngle += Math.PI / 2 + (Math.random() * 0.5 - 0.25);
        } else {
          const sx = Math.max(0, Math.min(this.spatialCols - 1, Math.floor(ant.x / this.spatialGridSize)));
          const sy = Math.max(0, Math.min(this.spatialRows - 1, Math.floor(ant.y / this.spatialGridSize)));
          
          const minX = Math.max(0, sx - 1);
          const maxX = Math.min(this.spatialCols - 1, sx + 1);
          const minY = Math.max(0, sy - 1);
          const maxY = Math.min(this.spatialRows - 1, sy + 1);

          if (ant.state === AntState.ATTACKING) {
            let foundEnemy = false;
            
            // 1. Check spiders
            for (let nx = minX; nx <= maxX && !foundEnemy; nx++) {
              for (let ny = minY; ny <= maxY && !foundEnemy; ny++) {
                for (const spider of this.spatialGrid[nx][ny].spiders) {
                  const dx = spider.x - ant.x;
                  const dy = spider.y - ant.y;
                  const dist = dx * dx + dy * dy;
                  if (dist < 10000) { // 100px vision when attacking
                    foundEnemy = true;
                    const angleToSpider = Math.atan2(dy, dx);
                    let angleDiff = angleToSpider - ant.wanderAngle;
                    while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    ant.wanderAngle += angleDiff * 0.08; // Weaker homing

                    if (dist < 400) {
                      spider.health -= ant.attackDamage;
                      ant.x = spider.x + (Math.random() - 0.5) * 15;
                      ant.y = spider.y + (Math.random() - 0.5) * 15;
                      isSticking = true;
                    }
                    break;
                  }
                }
              }
            }

            // 2. Check caterpillars
            if (!foundEnemy) {
              for (let nx = minX; nx <= maxX && !foundEnemy; nx++) {
                for (let ny = minY; ny <= maxY && !foundEnemy; ny++) {
                  for (const cat of this.spatialGrid[nx][ny].caterpillars) {
                    const dx = cat.x - ant.x;
                    const dy = cat.y - ant.y;
                    const dist = dx * dx + dy * dy;
                    if (dist < 10000) { // 100px vision when attacking
                      foundEnemy = true;
                      const angleToCat = Math.atan2(dy, dx);
                      let angleDiff = angleToCat - ant.wanderAngle;
                      while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
                      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                      ant.wanderAngle += angleDiff * 0.08; // Weaker homing

                      if (dist < 400) {
                        cat.health -= ant.attackDamage;
                        ant.x = cat.x + (Math.random() - 0.5) * 15;
                        ant.y = cat.y + (Math.random() - 0.5) * 15;
                        isSticking = true;
                      }
                      break;
                    }
                  }
                }
              }
            }

            // 3. Check enemy ants
            if (!foundEnemy) {
              for (let nx = minX; nx <= maxX && !foundEnemy; nx++) {
                for (let ny = minY; ny <= maxY && !foundEnemy; ny++) {
                  for (const enemyAnt of this.spatialGrid[nx][ny].ants) {
                    if (enemyAnt.colony === colony) continue;
                    const dx = enemyAnt.x - ant.x;
                    const dy = enemyAnt.y - ant.y;
                    const dist = dx * dx + dy * dy;
                    if (dist < 10000) { // 100px vision when attacking
                      foundEnemy = true;
                      const angleToEnemy = Math.atan2(dy, dx);
                      let angleDiff = angleToEnemy - ant.wanderAngle;
                      while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
                      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                      ant.wanderAngle += angleDiff * 0.08; // Weaker homing

                      if (dist < 400) { // 20px attack range
                        enemyAnt.health -= ant.attackDamage;
                        ant.x = enemyAnt.x + (Math.random() - 0.5) * 10;
                        ant.y = enemyAnt.y + (Math.random() - 0.5) * 10;
                        isSticking = true;
                      }
                      break;
                    }
                  }
                }
              }
            }

            if (foundEnemy && validGrid) {
              colony.alarmPheromones[gridX][gridY] = Math.min(255, colony.alarmPheromones[gridX][gridY] + 50);
              colony.activePheromones.add(gridX + gridY * this.cols);
            }

            if (!foundEnemy) {
              this.steerTowardsPheromone(ant, colony.alarmPheromones);
              if (centerAlarm < 10) {
                ant.state = ant.baseState;
              }
            }
          } else if (ant.state === AntState.FORAGING || ant.state === AntState.GUARDING) {
            if (validGrid) {
              colony.homePheromones[gridX][gridY] = Math.min(255, colony.homePheromones[gridX][gridY] + 5);
              colony.activePheromones.add(gridX + gridY * this.cols);
            }

            // 1. Check for enemies to attack
            let foundEnemy = false;
            const aggroRadiusSq = ant.caste === AntCaste.SOLDIER ? 22500 : 2500; // Soldiers see enemies from much further away (150px vs 50px)

            for (let nx = minX; nx <= maxX && !foundEnemy; nx++) {
              for (let ny = minY; ny <= maxY && !foundEnemy; ny++) {
                for (const cat of this.spatialGrid[nx][ny].caterpillars) {
                  const dx = cat.x - ant.x;
                  const dy = cat.y - ant.y;
                  if (dx * dx + dy * dy < aggroRadiusSq) {
                    if (ant.caste === AntCaste.WORKER) {
                      ant.wanderAngle = Math.atan2(dy, dx) + Math.PI;
                      foundEnemy = true;
                      break;
                    } else {
                      ant.state = AntState.ATTACKING;
                      foundEnemy = true;
                      break;
                    }
                  }
                }
                if (foundEnemy) break;
                for (const spider of this.spatialGrid[nx][ny].spiders) {
                  const dx = spider.x - ant.x;
                  const dy = spider.y - ant.y;
                  if (dx * dx + dy * dy < aggroRadiusSq) {
                    if (ant.caste === AntCaste.WORKER) {
                      ant.wanderAngle = Math.atan2(dy, dx) + Math.PI;
                      foundEnemy = true;
                      break;
                    } else {
                      ant.state = AntState.ATTACKING;
                      foundEnemy = true;
                      break;
                    }
                  }
                }
                if (foundEnemy) break;
                for (const enemyAnt of this.spatialGrid[nx][ny].ants) {
                  if (enemyAnt.colony === colony) continue;
                  const dx = enemyAnt.x - ant.x;
                  const dy = enemyAnt.y - ant.y;
                  if (dx * dx + dy * dy < aggroRadiusSq) {
                    if (ant.caste === AntCaste.WORKER) {
                      ant.wanderAngle = Math.atan2(dy, dx) + Math.PI;
                      foundEnemy = true;
                      break;
                    } else {
                      ant.state = AntState.ATTACKING;
                      foundEnemy = true;
                      break;
                    }
                  }
                }
              }
            }

            if (ant.state === AntState.GUARDING && !foundEnemy) {
              this.wander(ant);
              const dx = colony.moundX - ant.x;
              const dy = colony.moundY - ant.y;
              if (dx * dx + dy * dy > 40000) { // ~200px guard radius
                const angleToMound = Math.atan2(dy, dx);
                let angleDiff = angleToMound - ant.wanderAngle;
                while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                ant.wanderAngle += angleDiff * 0.1;
              }
            } else if (ant.state === AntState.FORAGING && !foundEnemy) {
              // 2. Check for food (Workers only)
              let foundFood = false;
              if (ant.caste === AntCaste.WORKER) {
                for (let nx = minX; nx <= maxX && !foundFood; nx++) {
                  for (let ny = minY; ny <= maxY && !foundFood; ny++) {
                    const cellFoods = this.spatialGrid[nx][ny].foods;
                    for (let j = cellFoods.length - 1; j >= 0; j--) {
                      const food = cellFoods[j];
                      const dx = food.x - ant.x;
                      const dy = food.y - ant.y;
                      
                      if (dx * dx + dy * dy < 100) {
                        ant.state = AntState.RETURNING;
                        ant.carryingFood = true;
                        let grab = Math.min(5, food.amount);
                        ant.payload = grab;
                        ant.wanderAngle = Math.atan2(colony.moundY - ant.y, colony.moundX - ant.x);
                        food.amount -= grab;
                        if (food.amount <= 0) {
                          cellFoods.splice(j, 1);
                          const globalIndex = this.foods.indexOf(food);
                          if (globalIndex > -1) this.foods.splice(globalIndex, 1);
                        }
                        foundFood = true;
                        break;
                      }
                    }
                  }
                }
              }

              if (!foundFood) {
                this.wander(ant);
                this.steerTowardsPheromone(ant, colony.foodPheromones);
              }
            }

          } else if (ant.state === AntState.RETURNING) {
            if (validGrid) {
              colony.foodPheromones[gridX][gridY] = Math.min(255, colony.foodPheromones[gridX][gridY] + 20);
              colony.activePheromones.add(gridX + gridY * this.cols);
            }

            const dx = colony.moundX - ant.x;
            const dy = colony.moundY - ant.y;
            const distSq = dx * dx + dy * dy;
            
            if (distSq < 1600) {
              ant.state = AntState.FORAGING;
              ant.carryingFood = false;
              colony.foodStored += ant.payload;
              ant.payload = 0;
              ant.wanderAngle = Math.PI + Math.atan2(dy, dx);
            } else {
              this.wander(ant);
              
              const angleToMound = Math.atan2(dy, dx);
              let angleDiff = angleToMound - ant.wanderAngle;
              while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              
              const steerStrength = distSq < 22500 ? 0.2 : 0.05;
              ant.wanderAngle += angleDiff * steerStrength;

              this.steerTowardsPheromone(ant, colony.homePheromones);
            }
          }
        }

        if (!isSticking) {
          ant.vx = Math.cos(ant.wanderAngle) * ant.speed;
          ant.vy = Math.sin(ant.wanderAngle) * ant.speed;
          ant.x += ant.vx;
          ant.y += ant.vy;
        }

        this.keepInBounds(ant);
      }
    }
  }

  wander(ant: Ant) {
    ant.wanderAngle += (Math.random() - 0.5) * 0.4;
  }

  steerTowardsPheromone(ant: Ant, pheromoneGrid: number[][]) {
    const lookAhead = 12;
    const sensorAngle = Math.PI / 4;

    const leftAngle = ant.wanderAngle - sensorAngle;
    const rightAngle = ant.wanderAngle + sensorAngle;
    const centerAngle = ant.wanderAngle;

    const getPheromone = (angle: number) => {
      const px = ant.x + Math.cos(angle) * lookAhead;
      const py = ant.y + Math.sin(angle) * lookAhead;
      const gx = Math.floor(px / this.gridSize);
      const gy = Math.floor(py / this.gridSize);
      if (this.isValidGrid(gx, gy)) {
        if (this.terrain[gx][gy] !== TerrainType.DIRT) return 0;
        return pheromoneGrid[gx][gy];
      }
      return 0;
    };

    const left = getPheromone(leftAngle);
    const right = getPheromone(rightAngle);
    const center = getPheromone(centerAngle);

    if (center > left && center > right) {
      // Keep going straight
    } else if (left > right) {
      ant.wanderAngle -= 0.15;
    } else if (right > left) {
      ant.wanderAngle += 0.15;
    }
  }
}
