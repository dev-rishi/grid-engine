import React, { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
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
  
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState())
  );
}

/**
 * Targeted selector for individual keys to achieve optimal performance (e.g. focusedCell, loadedBlocks).
 */
export function useGridKeySelector<T>(key: string, selector: (state: GridState) => T): T {
  const store = useGridStore();
  
  return useSyncExternalStore(
    (onStoreChange) => store.subscribeToKey(key, onStoreChange),
    () => selector(store.getState())
  );
}

/**
 * High-performance hook subscribing strictly to a single cell's coordinate changes.
 */
export function useGridCell(row: number, col: number) {
  const store = useGridStore();
  const key = `cell:${row},${col}`;
  
  const cellState = useSyncExternalStore(
    (onStoreChange) => store.subscribeToKey(key, onStoreChange),
    () => store.getCellState(row, col)
  );

  return cellState;
}

/**
 * Targeted hook for checking dynamic selection boundary states without re-rendering the whole table.
 */
export function useCellSelectionState(row: number, col: number) {
  const focusedCell = useGridKeySelector('focusedCell', (s) => s.focusedCell);
  const selectedRange = useGridKeySelector('selectedRange', (s) => s.selectedRange);

  const isFocused = focusedCell?.row === row && focusedCell?.col === col;
  
  const isSelected = useMemo(() => {
    if (!selectedRange) return false;
    const minRow = Math.min(selectedRange.start.row, selectedRange.end.row);
    const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row);
    const minCol = Math.min(selectedRange.start.col, selectedRange.end.col);
    const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col);
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  }, [selectedRange, row, col]);

  return { isFocused, isSelected };
}

/**
 * React hook yielding custom input and focus bindings for active edit registers.
 */
export function useCellEditState(row: number, col: number) {
  const store = useGridStore();
  const activeEditCell = useGridKeySelector('activeEditCell', (s) => s.activeEditCell);
  const activeEditValue = useGridKeySelector('activeEditValue', (s) => s.activeEditValue);

  const isEditing = activeEditCell?.row === row && activeEditCell?.col === col;

  const setValue = (val: string) => {
    store.setState({ activeEditValue: val });
  };

  return { isEditing, value: activeEditValue, setValue };
}

/**
 * Controller integration hook mapping standard interaction event handlers.
 */
export function useGridNavigationController(options: GridNavigationOptions = {}) {
  const store = useGridStore();
  
  const controller = useMemo(() => {
    return new GridNavigationController(store, options);
  }, [store, options]);

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
