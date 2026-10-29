// Kept aligned with supabase/migrations/202610260001_initial_schema.sql.
// Regenerate from the project after applying the migration when additional SQL changes land.
type RowTable<Row, Insert = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

type Profile = { id: string; username: string; display_name: string; account_type: "passenger" | "trip_host"; avatar_path: string | null; bio: string | null; home_area: string | null; verified: boolean; rating_average: number; trips_completed: number; co2_saved_kg: number; created_at: string; updated_at: string };
type Vehicle = { id: string; owner_id: string; make: string; model: string; color: string; plate_last_four: string | null; seats: number; verified: boolean; created_at: string };
type Trip = { id: string; host_id: string; vehicle_id: string | null; origin: string; destination: string; pickup_point: string | null; dropoff_point: string | null; origin_lat: number | null; origin_lng: number | null; destination_lat: number | null; destination_lng: number | null; departure_at: string; available_seats: number; contribution_per_seat: number; trip_reason: string; existing_journey_confirmed: boolean; recurrence_id: string | null; status: string; notes: string | null; created_at: string; updated_at: string };
type TripPrivateLocation = { trip_id: string; host_id: string; origin_label: string; origin_lat: number; origin_lng: number; destination_label: string; destination_lat: number; destination_lng: number; pickup_label: string | null; pickup_lat: number | null; pickup_lng: number | null; dropoff_label: string | null; dropoff_lat: number | null; dropoff_lng: number | null; created_at: string };
type RecurringCommute = { id: string; owner_id: string; origin: string; destination: string; weekdays: number[]; preferred_time: string; seats: number; role: string; active: boolean; created_at: string; updated_at: string };
type SeatRequest = { id: string; trip_id: string; passenger_id: string; seats_requested: number; status: string; boarding_code: string | null; created_at: string; updated_at: string };
type Community = { id: string; name: string; kind: string; description: string | null; verified: boolean; is_demo: boolean; created_at: string };
type CommunityMembership = { community_id: string; member_id: string; status: string; joined_at: string };
type Message = { id: string; trip_id: string; sender_id: string; body: string; created_at: string; read_at: string | null };
type Rating = { id: string; trip_id: string; author_id: string; subject_id: string; score: number; note: string | null; created_at: string };
type SafetyReport = { id: string; reporter_id: string; reported_user_id: string | null; trip_id: string | null; category: string; details: string; status: string; created_at: string };
type UserBlock = { blocker_id: string; blocked_id: string; created_at: string };
type TrustedContact = { id: string; owner_id: string; name: string; phone: string; created_at: string };
type PushSubscription = { id: string; owner_id: string; endpoint: string; subscription: Record<string, unknown>; created_at: string };
type Notification = { id: string; owner_id: string; kind: string; title: string; body: string; href: string | null; read_at: string | null; created_at: string };

export type Database = {
  public: {
    Tables: {
      profiles: RowTable<Profile, Pick<Profile, "id" | "username" | "display_name"> & Partial<Profile>>;
      vehicles: RowTable<Vehicle, Pick<Vehicle, "owner_id" | "make" | "model" | "color" | "seats"> & Partial<Vehicle>>;
      trips: RowTable<Trip, Pick<Trip, "host_id" | "origin" | "destination" | "departure_at" | "available_seats" | "contribution_per_seat" | "trip_reason" | "existing_journey_confirmed"> & Partial<Trip>>;
      trip_private_locations: RowTable<TripPrivateLocation, Pick<TripPrivateLocation, "trip_id" | "host_id" | "origin_label" | "origin_lat" | "origin_lng" | "destination_label" | "destination_lat" | "destination_lng"> & Partial<TripPrivateLocation>>;
      recurring_commutes: RowTable<RecurringCommute, Pick<RecurringCommute, "owner_id" | "origin" | "destination" | "weekdays" | "preferred_time" | "role"> & Partial<RecurringCommute>>;
      seat_requests: RowTable<SeatRequest, Pick<SeatRequest, "trip_id" | "passenger_id"> & Partial<SeatRequest>>;
      communities: RowTable<Community, Pick<Community, "name" | "kind"> & Partial<Community>>;
      community_memberships: RowTable<CommunityMembership, Pick<CommunityMembership, "community_id" | "member_id"> & Partial<CommunityMembership>>;
      messages: RowTable<Message, Pick<Message, "trip_id" | "sender_id" | "body"> & Partial<Message>>;
      ratings: RowTable<Rating, Pick<Rating, "trip_id" | "author_id" | "subject_id" | "score"> & Partial<Rating>>;
      safety_reports: RowTable<SafetyReport, Pick<SafetyReport, "reporter_id" | "category" | "details"> & Partial<SafetyReport>>;
      user_blocks: RowTable<UserBlock, Pick<UserBlock, "blocker_id" | "blocked_id"> & Partial<UserBlock>>;
      trusted_contacts: RowTable<TrustedContact, Pick<TrustedContact, "owner_id" | "name" | "phone"> & Partial<TrustedContact>>;
      push_subscriptions: RowTable<PushSubscription, Pick<PushSubscription, "owner_id" | "endpoint" | "subscription"> & Partial<PushSubscription>>;
      notifications: RowTable<Notification, Pick<Notification, "owner_id" | "kind" | "title" | "body"> & Partial<Notification>>;
    };
    Views: { trip_search: RowTable<Pick<Trip, "id" | "host_id" | "vehicle_id" | "origin" | "destination" | "pickup_point" | "dropoff_point" | "origin_lat" | "origin_lng" | "destination_lat" | "destination_lng" | "departure_at" | "available_seats" | "contribution_per_seat" | "trip_reason" | "notes" | "created_at">> };
    Functions: {
      request_trip_seat: { Args: { p_trip_id: string; p_seats?: number }; Returns: string };
      review_seat_request: { Args: { p_request_id: string; p_decision: string }; Returns: undefined };
      confirm_trip_boarding: { Args: { p_request_id: string; p_code: string }; Returns: undefined };
      is_trip_member: { Args: { p_trip_id: string }; Returns: boolean };
      is_user_blocked: { Args: { p_other_id: string }; Returns: boolean };
      is_community_member: { Args: { p_community_id: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
