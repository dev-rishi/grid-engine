import React, { createContext, useContext, useMemo, useSyncExternalStore, useRef, useCallback } from 'react';
import { GridStore, GridState, GridNavigationController, GridNavigationOptions, GridApi } from '@grid-engine/core';

// Create Grid Context
const GridContext = createContext<GridStore | null>(null);

export interface GridProviderProps {
  store: GridStore;
  children: React.ReactNode;
}

export function GridProvider({ store, children }: GridProviderProps) {
  return (
    <GridContext.Provider value={store}>
      {children}
    </GridContext.Provider>
  );
}

export function useGridStore(): GridStore {
  const context = useContext(GridContext);
  if (!context) {
    throw new Error('useGridStore must be used within a GridProvider');
  }
  return context;
}

export function useGridApi(): GridApi {
  return useGridStore();
}

/**
 * Custom selector hook utilizing useSyncExternalStore for targeted re-renders.
 */
export function useGridSelector<T>(selector: (state: GridState) => T): T {
  const store = useGridStore();
  
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  
  const getSnapshot = useCallback(
    () => selectorRef.current(store.getState()),
    [store]
  );

  return useSyncExternalStore(
    store.subscribe,
    getSnapshot
  );
}

/**
 * Targeted selector for individual keys to achieve optimal performance (e.g. focusedCell, loadedBlocks).
 */
export function useGridKeySelector<T>(key: string, selector: (state: GridState) => T): T {
  const store = useGridStore();

  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const subscribe = useCallback(
    (onStoreChange: () => void) => store.subscribeToKey(key, onStoreChange),
    [store, key]
  );

  const getSnapshot = useCallback(
    () => selectorRef.current(store.getState()),
    [store]
  );

  return useSyncExternalStore(
    subscribe,
    getSnapshot
  );
}

/**
 * High-performance hook subscribing strictly to a single cell's coordinate changes.
 */
export function useGridCell(row: number, col: number) {
  const store = useGridStore();
  const key = `cell:${row},${col}`;

  const subscribe = useCallback(
    (onStoreChange: () => void) => store.subscribeToKey(key, onStoreChange),
    [store, key]
  );

  const getSnapshot = useCallback(
    () => store.getCellState(row, col),
    [store, row, col]
  );

  const cellState = useSyncExternalStore(subscribe, getSnapshot);

  return cellState;
}

/**
 * Targeted hook for checking dynamic selection boundary states without re-rendering the whole table.
 */
export function useCellSelectionState(row: number, col: number) {
  const isFocused = useGridKeySelector('focusedCell', (s) => s.focusedCell?.row === row && s.focusedCell?.col === col);

  const isSelected = useGridKeySelector('selectedRange', (s) => {
    const range = s.selectedRange;
    if (!range) return false;
    const minRow = Math.min(range.start.row, range.end.row);
    const maxRow = Math.max(range.start.row, range.end.row);
    const minCol = Math.min(range.start.col, range.end.col);
    const maxCol = Math.max(range.start.col, range.end.col);
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  });

  return { isFocused, isSelected };
}

/**
 * React hook yielding custom input and focus bindings for active edit registers.
 */
export function useCellEditState(row: number, col: number) {
  const store = useGridStore();
  const isEditing = useGridKeySelector('activeEditCell', (s) => s.activeEditCell?.row === row && s.activeEditCell?.col === col);

  // Only subscribe to edit value updates when this cell is the active editor, preventing O(N) re-renders on every keystroke
  const value = useGridKeySelector('activeEditValue', (s) =>
    s.activeEditCell?.row === row && s.activeEditCell?.col === col ? s.activeEditValue : ''
  );

  const setValue = (val: string) => {
    store.setState({ activeEditValue: val });
  };

  return { isEditing, value, setValue };
}

/**
 * Controller integration hook mapping standard interaction event handlers.
 */
export function useGridNavigationController(options: GridNavigationOptions = {}) {
  const store = useGridStore();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const controller = useMemo(() => {
    return new GridNavigationController(store, {
      onCellValueChanged: (row, col, val) => optionsRef.current.onCellValueChanged?.(row, col, val),
      get editTrigger() { return optionsRef.current.editTrigger; },
      get arrowKeyNavigationEdit() { return optionsRef.current.arrowKeyNavigationEdit; }
    });
  }, [store]);

  return controller;
}

export interface CellRendererProps {
  row: number;
  col: number;
  value: any;
  computedValue: any;
  api: GridApi;
}

export interface CellEditorProps {
  row: number;
  col: number;
  value: any;
  onChange: (val: any) => void;
  onCommit: () => void;
  onCancel: () => void;
  api: GridApi;
}
