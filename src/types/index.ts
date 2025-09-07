// 核心数据类型定义

export interface Location {
  latitude: number;
  longitude: number;
}

export interface TravelPlan {
  id: string;
  userId: string;
  name: string;
  timeSlots: TimeSlot[];
  destinations: Destination[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeSlot {
  id: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  destinationIds: string[]; // destination IDs
}

export interface Destination {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  category?: string; // work, shopping, entertainment, etc.
}

export interface WaitingSpot {
  id: string;
  userId: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // meters, default 50
  transitStops: TransitStop[];
  isActive: boolean;
  createdAt: Date;
}

export interface TransitStop {
  id: string;
  name: string;
  type: 'bus' | 'train' | 'lightrail';
  latitude: number;
  longitude: number;
  lines: string[]; // route/line names
  stopCode?: string;
}

export interface TransitOption {
  id: string;
  type: 'bus' | 'train' | 'lightrail';
  line: string;
  direction: string;
  stopName: string;
  arrivalTime: Date;
  destination: string;
  estimatedTravelTime: number; // minutes to destination
  matchingPlanIds: string[]; // matching travel plan IDs
  distanceToDestination: number; // meters
  heading: number; // 0-360 degrees
}

export interface Ticket {
  id: string;
  userId: string;
  transitOption: TransitOption;
  purchaseTime: Date;
  status: 'purchased' | 'used' | 'expired' | 'cancelled';
  qrCode?: string;
  price: number;
  validUntil: Date;
}

// UI state types
export interface LocationState {
  current: Location | null;
  heading: number; // device heading in degrees
  isInWaitingSpot: boolean;
  activeWaitingSpot: WaitingSpot | null;
  accuracy: number;
  lastUpdate: Date | null;
}

export interface UIState {
  activeTab: string;
  isLoading: boolean;
  error: string | null;
  selectedTransitOption: TransitOption | null;
  showTicket: boolean;
}

// App context state
export interface AppState {
  user: any; // AWS Amplify user object
  location: LocationState;
  travelPlans: TravelPlan[];
  waitingSpots: WaitingSpot[];
  transitOptions: TransitOption[];
  tickets: Ticket[];
  ui: UIState;
}

// API response types
export interface NJTransitResponse {
  routes: NJTransitRoute[];
  stops: NJTransitStop[];
  arrivals: NJTransitArrival[];
}

export interface NJTransitRoute {
  routeId: string;
  routeName: string;
  routeType: 'bus' | 'train' | 'lightrail';
  direction: string;
}

export interface NJTransitStop {
  stopId: string;
  stopName: string;
  latitude: number;
  longitude: number;
  routes: string[];
}

export interface NJTransitArrival {
  routeId: string;
  stopId: string;
  arrivalTime: Date;
  destination: string;
  delay?: number; // minutes
}

// Google Maps types
export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapMarker {
  id: string;
  coordinate: Location;
  title: string;
  description?: string;
  type: 'destination' | 'waitingSpot' | 'transitStop';
}

// Context action types
export type AppAction =
  | { type: 'SET_LOCATION'; payload: LocationState }
  | { type: 'ADD_TRAVEL_PLAN'; payload: TravelPlan }
  | { type: 'UPDATE_TRAVEL_PLAN'; payload: TravelPlan }
  | { type: 'DELETE_TRAVEL_PLAN'; payload: string }
  | { type: 'ADD_WAITING_SPOT'; payload: WaitingSpot }
  | { type: 'UPDATE_WAITING_SPOT'; payload: WaitingSpot }
  | { type: 'DELETE_WAITING_SPOT'; payload: string }
  | { type: 'SET_TRANSIT_OPTIONS'; payload: TransitOption[] }
  | { type: 'ADD_TICKET'; payload: Ticket }
  | { type: 'UPDATE_TICKET'; payload: Ticket }
  | { type: 'SET_UI_STATE'; payload: Partial<UIState> }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean };

// Service interfaces
export interface LocationService {
  getCurrentLocation(): Promise<Location>;
  watchPosition(callback: (location: Location) => void): () => void;
  getHeading(): Promise<number>;
  watchHeading(callback: (heading: number) => void): () => void;
}

export interface TransitService {
  getArrivals(stopId: string): Promise<NJTransitArrival[]>;
  purchaseTicket(transitOption: TransitOption): Promise<Ticket>;
  getRoutes(): Promise<NJTransitRoute[]>;
  getStops(): Promise<NJTransitStop[]>;
}

export interface RecommendationService {
  getRecommendations(
    location: Location,
    heading: number,
    travelPlans: TravelPlan[],
    currentTime: Date
  ): Promise<TransitOption[]>;
}