export type Plan = 'FULL' | 'ADMIN_ONLY';
export interface RoomDTO { number: string; status: string; type: string; }
export interface ReservationDTO {
  checkIn: string; checkOut: string; roomId: string; clientId: string;
  origin: 'ADMIN' | 'WEB';
}
