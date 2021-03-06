import Tile from './tile.js';

import random from 'lodash/random';
import merge from 'lodash/merge';
import flatten from 'lodash/flatten';

class Board {
  constructor(stage, queue, score) {
    this.types = [ 'earth', 'jupiter', 'mars',
                   'saturn', 'sun', 'blackhole' ];

    this.stage = stage;
    this.queue = queue;

    this.score = score;
    this.cleared = true;

    this.delay = 1300;

    this.grid = this.createBoard();

    this.populateBoard();
    this.checkBoard(true);

    this.populateBoard = this.populateBoard.bind(this);

    this.createTile = this.createTile.bind(this);
    this.removeTiles = this.removeTiles.bind(this);
    this.replaceTiles = this.replaceTiles.bind(this);

    this.moveTile = this.moveTile.bind(this);
    this.swapTiles = this.swapTiles.bind(this);

    this.findMatches = this.findMatches.bind(this);
    this.findSwapTgt = this.findSwapTgt.bind(this);

    this.checkRow = this.checkRow.bind(this);
    this.checkCol = this.checkCol.bind(this);

    this.checkBoard = this.checkBoard.bind(this);
    this.checkSlice = this.checkSlice.bind(this);
  }

  createBoard() {
    let grid = new Array(8);
    for (let i = 0; i < grid.length; i++)
      grid[i] = new Array(8);
    return grid;
  }

  populateBoard() {
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        this.createTile([i, j]);
      }
    }
  }

  createTile(pos, type, initial) {
    type = type || this.types[random(0, 5)];

    const tile = new Tile(pos, type, this.queue);

    tile.object.addEventListener('pressmove', this.moveTile(tile));
    tile.object.addEventListener('pressup', this.findSwapTgt(tile));

    this.stage.addChild(tile.object);

    const oldTile = this.grid[pos[0]][pos[1]];

    if (oldTile) {
      if (initial) {
        this.stage.removeChild(oldTile.object);
      } else {
        oldTile.addMatchZoom(this.removeTiles);
      }
    }

    this.grid[tile.row][tile.col] = tile;

    return tile;
  }

  removeTiles(tiles) {
    tiles.forEach(tile => {
      tile.object.removeEventListener('pressmove', this.moveTile(tile));
      tile.object.removeEventListener('pressup', this.findSwapTgt(tile));
      this.stage.removeChild(tile.object);
    });
  }

  replaceTiles(tiles, initial, afterMove) {
    if (!initial) {
      this.score.receiveCount(tiles.length);
    }

    tiles.forEach(tile => {
      const type = this.types[random(0, 5)];
      const pos = [tile.row, tile.col];

      if (!initial) {
        tile.addMatchZoom(this.removeTiles);
      } else {
        this.removeTiles([tile]);
      }

      const newTile = this.createTile(pos, type, initial);

      if (!initial) {
        newTile.addDelayedFadeIn();
      }

      this.grid[tile.row][tile.col] = newTile;
    });
  }

  moveTile(tile) {
    return event => {
      console.log(tile);
      const OFFSET = 25;
      const DISTANCE = 60;

      const limitRowTop = tile.row_coord - DISTANCE + OFFSET;
      const limitRowBot = tile.row_coord + DISTANCE + OFFSET;
      const limitColTop = tile.col_coord - DISTANCE + OFFSET;
      const limitColBot = tile.col_coord + DISTANCE + OFFSET;

      const row = event.stageY;
      const col = event.stageX;

      if (row < limitRowBot && row > limitRowTop
       && col < limitColBot && col > limitColTop
       && row > 40 && row < 460
       && col > 40 && col < 460)
      {
        this.stage.setChildIndex(event.currentTarget,
                                 this.stage.getNumChildren() - 1);

        event.currentTarget.x = col - OFFSET;
        event.currentTarget.y = row - OFFSET;
      }
    };
  }

  findSwapTgt(tile) {
    return event => {
      let tgt;
      const grid = this.grid;

      const rowDiff = event.target.y - tile.row_coord;
      const colDiff = event.target.x - tile.col_coord;

      // LEFT
      if (rowDiff > -25 && rowDiff <  25
       && colDiff > -75 && colDiff < -25) {
        tgt = grid[tile.row][tile.col - 1];
      }

      // RIGHT
      if (rowDiff > -25 && rowDiff < 25
       && colDiff >  25 && colDiff < 75) {
        tgt = grid[tile.row][tile.col + 1];
      }

      // UP
      if (rowDiff > -75 && rowDiff < -25
       && colDiff > -25 && colDiff < 25) {
        tgt = grid[tile.row - 1][tile.col];
      }

      // DOWN
      if (rowDiff >  25 && rowDiff < 75
       && colDiff > -25 && colDiff < 25) {
        tgt = grid[tile.row + 1][tile.col];
      }

      // L TOP // L BOT // R TOP // R BOT
      if (rowDiff < -25 && colDiff < -25
       || rowDiff >  25 && colDiff < -25
       || rowDiff < -25 && colDiff >  25
       || rowDiff >  25 && colDiff > 25) {
        event.currentTarget.x = tile.col_coord;
        event.currentTarget.y = tile.row_coord;
        return;
      }

      if (rowDiff > -20 && rowDiff < 20 &&
          colDiff > -20 && colDiff < 20 ) {
        event.currentTarget.x = tile.col_coord;
        event.currentTarget.y = tile.row_coord;
        return;

      } else {
        let matches = this.findMatches(tile, tgt);

        if (matches.length < 2) {
          matches = this.findMatches(tgt, tile);

          if (matches.length > 1) {
            this.swapTiles(tgt, tile, matches);
            return;
          }
        }

        if (matches.length > 1) {
          this.swapTiles(tile, tgt, matches);

        } else {
          event.currentTarget.x = tile.col_coord;
          event.currentTarget.y = tile.row_coord;
        }
      }
    };
  }

  swapTiles(src, tgt, matches) {
    const newTgt = this.createTile(tgt.pos, src.type);
    matches.push(newTgt);

    this.replaceTiles(matches);

    this.removeTiles([src, tgt]);
    this.createTile(src.pos, tgt.type);


    this.checkBoard(false, true);
  }

  findMatches(src, tgt) {
    let rowMatches = this.checkRow(src, tgt);
    let colMatches = this.checkCol(src, tgt);

    if (rowMatches.length < 2)
      rowMatches = [];

    if (colMatches.length < 2)
      colMatches = [];

    return rowMatches.concat(colMatches);
  }

  checkRow(src, tgt) {
    const matches = [];
    const row = this.grid[tgt.row];

    let i = 1;

    // CHECK LEFT
    while (tgt.col - i >= 0 && row[tgt.col - i].type === src.type) {
      if (tgt.col - i === src.col) {
        break;
      }
      matches.push(row[tgt.col - i]);
      i++;
    }

    i = 1;

    // CHECK RIGHT
    while (tgt.col + i <= 7 && row[tgt.col + i].type === src.type) {
      if (tgt.col + i === src.col) {
        break;
      }
      matches.push(row[tgt.col + i]);
      i++;
    }

    return matches;
  }

  checkCol(src, tgt) {
    const matches = [];
    const col = new Array(8);

    for (let i = 0; i < 8; i++) {
      col[i] = this.grid[i][tgt.col];
    }

    let i = 1;

    // CHECK LEFT
    while (tgt.row - i >= 0 && col[tgt.row - i].type === src.type) {
      if (tgt.row - i === src.row) {
        break;
      }
      matches.push(col[tgt.row - i]);
      i++;
    }

    i = 1;

    // CHECK RIGHT
    while (tgt.row + i <= 7 && col[tgt.row + i].type === src.type) {
      if (tgt.row + i === src.row) {
        break;
      }
      matches.push(col[tgt.row + i]);
      i++;
    }

    return matches;
  }

  checkBoard(initial, afterMove) {
    const delay = initial ? 0 : this.delay;

    setTimeout(
      () => {
        this.cleared = true;

        // https://gist.github.com/femto113/1784503
        const transposedGrid = this.grid.map(
          (row, col) => this.grid.map(row => row[col])
        );

        this.grid.forEach(row => {
          this.checkSlice(row, initial, afterMove);
        });

        transposedGrid.forEach(col => {
          this.checkSlice(col, initial, afterMove);
        });

        if (!this.cleared) {
          this.checkBoard(initial, afterMove);
        }
      },
    delay, this);
  }

  checkSlice(row, initial, afterMove) {
    for (let length = 5; length > 2; length--) {
      for (let i = 0; i < 9 - length; i++) {
        const slice = row.slice(i, i + length);
        if (this.checkMatches(slice)) {
          this.replaceTiles(slice, initial, afterMove);
          this.cleared = false;
        }
      }
    }
  }

  checkMatches(tiles) {
    const type = tiles[0].type;

    for (let i = 1; i < tiles.length; i++) {
      if (tiles[i].type !== type)
        return false;
    }

    return true;
  }
}

export default Board;
