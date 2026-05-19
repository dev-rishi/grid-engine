import { describe, it, expect, vi } from 'vitest';
import { GridStore } from './store.js';

describe('GridStore micro-store functionality', () => {
  it('should initialize with standard default states', () => {
    const store = new GridStore({ rowCount: 10, colCount: 5 });
    const state = store.getState();
    
    expect(state.rowCount).toBe(10);
    expect(state.colCount).toBe(5);
    expect(state.focusedCell).toBeNull();
    expect(state.selectedRange).toBeNull();
    expect(state.cells).toEqual({});
  });

  it('should notify targeted key-subscribers only when that specific key is mutated', () => {
    const store = new GridStore({ rowCount: 10, colCount: 5 });
    
    const cellListener = vi.fn();
    const focusListener = vi.fn();

    // Subscribe to specific cell coordinate key and focusedCell key
    store.subscribeToKey('cell:0,0', cellListener);
    store.subscribeToKey('focusedCell', focusListener);

    // Act: Set focused cell
    store.setState({ focusedCell: { row: 0, col: 0 } });

    // Assert: focusedCell subscriber fires, cell subscriber does not
    expect(focusListener).toHaveBeenCalledTimes(1);
    expect(cellListener).toHaveBeenCalledTimes(0);

    // Act: Change value of cell 0,0
    store.setCellValue(0, 0, 'Laser Product');

    // Assert: cell subscriber fires, focusedCell subscriber does not fire again
    expect(focusListener).toHaveBeenCalledTimes(1);
    expect(cellListener).toHaveBeenCalledTimes(1);
    expect(store.getCellState(0, 0).value).toBe('Laser Product');
  });

  it('should return default cell values for uninitialized grid coordinates safely', () => {
    const store = new GridStore();
    const cell = store.getCellState(100, 100);
    
    expect(cell.value).toBe('');
    expect(cell.computedValue).toBe('');
    expect(cell.isEditing).toBe(false);
  });
});
