import { create } from 'zustand';

interface BookingStore {
  isOpen: boolean;
  serviceId?: string | null;
  barberId?: string | null;
  open: (serviceId?: string | null, barberId?: string | null) => void;
  close: () => void;
}

export const useBooking = create<BookingStore>((set) => ({
  isOpen: false,
  serviceId: null,
  barberId: null,
  open: (serviceId, barberId) => set({ isOpen: true, serviceId: serviceId || null, barberId: barberId || null }),
  close: () => set({ isOpen: false, serviceId: null, barberId: null }),
}));
