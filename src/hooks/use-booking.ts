import { create } from 'zustand';

interface BookingStore {
  isOpen: boolean;
  serviceId?: string | null;
  open: (serviceId?: string | null) => void;
  close: () => void;
}

export const useBooking = create<BookingStore>((set) => ({
  isOpen: false,
  serviceId: null,
  open: (serviceId) => set({ isOpen: true, serviceId: serviceId || null }),
  close: () => set({ isOpen: false, serviceId: null }),
}));
