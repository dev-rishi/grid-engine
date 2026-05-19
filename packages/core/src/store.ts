export interface GridCellCoordinate {
  row: number;
  col: number;
}

export interface GridCellRange {
  start: GridCellCoordinate;
  end: GridCellCoordinate;
}

export interface CellState {
  value: any;
  computedValue?: any;
  isEditing?: boolean;
}

export interface GridState {
  rowCount: number;
  colCount: number;
  focusedCell: GridCellCoordinate | null;
  selectedRange: GridCellRange | null;
  cells: Record<string, CellState>; // Keyed as "r,c"
  rowHeights: Record<number, number>; // row index -> height in px
  colWidths: Record<number, number>; // col index -> width in px
  defaultRowHeight: number;
  defaultColWidth: number;
  
  // Model-specific states
  loadingBlocks: Record<number, boolean>; // blockIndex -> isFetching
  loadedBlocks: Record<number, any[]>; // blockIndex -> rows
  rowModelType: 'client' | 'server';

  // Active edit state registers
  activeEditCell: GridCellCoordinate | null;
  activeEditValue: string;
}

export type GridStateUpdater = Partial<GridState> | ((state: GridState) => Partial<GridState>);

export type Listener = (state: GridState) => void;

export class GridStore {
  private state: GridState;
  private listeners = new Set<Listener>();
  private keyListeners = new Map<string, Set<Listener>>();

  constructor(initialState: Partial<GridState> = {}) {
    this.state = {
      rowCount: 0,
      colCount: 0,
      focusedCell: null,
      selectedRange: null,
      cells: {},
      rowHeights: {},
      colWidths: {},
      defaultRowHeight: 40,
      defaultColWidth: 100,
      loadingBlocks: {},
      loadedBlocks: {},
      rowModelType: 'client',
      activeEditCell: null,
      activeEditValue: '',
      ...initialState,
    };
  }

  public getState = (): GridState => {
    return this.state;
  };

  /**
   * Update the store state and selectively trigger listeners for modified keys.
   */
  public setState = (updater: GridStateUpdater): void => {
    const nextState = typeof updater === 'function' ? updater(this.state) : updater;
    
    // Quick diff of updated keys
    const updatedKeys = new Set<string>();
    const prevState = this.state;
    
    // Construct new state
    this.state = { ...prevState, ...nextState };
    
    // Identify changed root-level state keys
    for (const key of Object.keys(nextState) as Array<keyof GridState>) {
      if (prevState[key] !== this.state[key]) {
        updatedKeys.add(key);
      }
    }

    // Special deep checking for 'cells' additions/updates
    if (nextState.cells) {
      const prevCells = prevState.cells;
      const nextCells = this.state.cells;
      
      for (const coordKey of Object.keys(nextCells)) {
        if (prevCells[coordKey] !== nextCells[coordKey]) {
          updatedKeys.add(`cell:${coordKey}`);
        }
      }
    }

    // Notify global listeners
    if (updatedKeys.size > 0) {
      this.listeners.forEach((listener) => listener(this.state));
    }

    // Notify targeted key listeners
    updatedKeys.forEach((key) => {
      const targeted = this.keyListeners.get(key);
      if (targeted) {
        targeted.forEach((listener) => listener(this.state));
      }
    });
  };

  /**
   * Subscribe globally to any state change.
   */
  public subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Subscribe to a targeted key or coordinate (e.g. "focusedCell" or "cell:0,0")
   */
  public subscribeToKey = (key: string, listener: Listener): (() => void) => {
    if (!this.keyListeners.has(key)) {
      this.keyListeners.set(key, new Set());
    }
    
    const set = this.keyListeners.get(key)!;
    set.add(listener);
    
    return () => {
      set.delete(listener);
      if (set.size === 0) {
        this.keyListeners.delete(key);
      }
    };
  };

  /**
   * Helper to set value of a single cell.
   */
  public setCellValue = (row: number, col: number, value: any, computedValue?: any): void => {
    const key = `${row},${col}`;
    this.setState((state) => ({
      cells: {
        ...state.cells,
        [key]: {
          ...state.cells[key],
          value,
          computedValue: computedValue ?? value,
        },
      },
    }));
  };

  /**
   * Helper to get cell state safely.
   */
  public getCellState = (row: number, col: number): CellState => {
    return this.state.cells[`${row},${col}`] || { value: '', computedValue: '', isEditing: false };
  };
}
