import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, AppAction, LocationState, UIState } from '../types';

// 初始状态
const initialLocationState: LocationState = {
  current: null,
  heading: 0,
  isInWaitingSpot: false,
  activeWaitingSpot: null,
  accuracy: 0,
  lastUpdate: null,
};

const initialUIState: UIState = {
  activeTab: 'map',
  isLoading: false,
  error: null,
  selectedTransitOption: null,
  showTicket: false,
};

const initialState: AppState = {
  user: null,
  location: initialLocationState,
  travelPlans: [],
  waitingSpots: [],
  transitOptions: [],
  tickets: [],
  ui: initialUIState,
};

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOCATION':
      return {
        ...state,
        location: action.payload,
      };

    case 'ADD_TRAVEL_PLAN':
      return {
        ...state,
        travelPlans: [...state.travelPlans, action.payload],
      };

    case 'UPDATE_TRAVEL_PLAN':
      return {
        ...state,
        travelPlans: state.travelPlans.map(plan =>
          plan.id === action.payload.id ? action.payload : plan
        ),
      };

    case 'DELETE_TRAVEL_PLAN':
      return {
        ...state,
        travelPlans: state.travelPlans.filter(plan => plan.id !== action.payload),
      };

    case 'ADD_WAITING_SPOT':
      return {
        ...state,
        waitingSpots: [...state.waitingSpots, action.payload],
      };

    case 'UPDATE_WAITING_SPOT':
      return {
        ...state,
        waitingSpots: state.waitingSpots.map(spot =>
          spot.id === action.payload.id ? action.payload : spot
        ),
      };

    case 'DELETE_WAITING_SPOT':
      return {
        ...state,
        waitingSpots: state.waitingSpots.filter(spot => spot.id !== action.payload),
      };

    case 'SET_TRANSIT_OPTIONS':
      return {
        ...state,
        transitOptions: action.payload,
      };

    case 'ADD_TICKET':
      return {
        ...state,
        tickets: [...state.tickets, action.payload],
      };

    case 'UPDATE_TICKET':
      return {
        ...state,
        tickets: state.tickets.map(ticket =>
          ticket.id === action.payload.id ? action.payload : ticket
        ),
      };

    case 'SET_UI_STATE':
      return {
        ...state,
        ui: { ...state.ui, ...action.payload },
      };

    case 'SET_ERROR':
      return {
        ...state,
        ui: { ...state.ui, error: action.payload },
      };

    case 'SET_LOADING':
      return {
        ...state,
        ui: { ...state.ui, isLoading: action.payload },
      };

    default:
      return state;
  }
}

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

// Action creators
export const actions = {
  setLocation: (location: LocationState): AppAction => ({
    type: 'SET_LOCATION',
    payload: location,
  }),

  setError: (error: string | null): AppAction => ({
    type: 'SET_ERROR',
    payload: error,
  }),

  setLoading: (loading: boolean): AppAction => ({
    type: 'SET_LOADING',
    payload: loading,
  }),

  setUIState: (uiState: Partial<UIState>): AppAction => ({
    type: 'SET_UI_STATE',
    payload: uiState,
  }),
};