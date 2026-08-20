'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Calendar, Clock, ArrowLeft, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import gsap from 'gsap';

interface Organizer {
  id: string;
  name: string;
  email: string;
  specialty: string;
  avatar_url?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface DayAvailability {
  date: string;
  dayName: string;
  slots: TimeSlot[];
}

export default function BookingCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableDays, setAvailableDays] = useState<DayAvailability[]>([]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingData, setBookingData] = useState({ name: '', email: '', phone: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cardsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    fetchOrganizer();
  }, [params.id]);

  const fetchOrganizer = async () => {
    try {
      const response = await fetch(`/api/public/organizers/${params.id}`);
      const data = await response.json();
      setOrganizer(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch organizer:', error);
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    fetchAvailableSlots(date);
  };

  const fetchAvailableSlots = async (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    try {
      const response = await fetch(`/api/public/availability/${params.id}?date=${dateStr}`);
      const data = await response.json();
      setAvailableDays([{
        date: dateStr,
        dayName: date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
        slots: data.slots || []
      }]);
    } catch (error) {
      console.error('Failed to fetch availability:', error);
    }
  };

  const handleTimeClick = (time: string) => {
    setSelectedTime(time);
    setIsBookingModalOpen(true);
  };

  const handleBookingSubmit = async () => {
    if (!bookingData.name.trim() || !bookingData.email.trim() || !bookingData.phone.trim()) {
      alert('Veuillez renseigner votre nom, email et téléphone.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizerId: params.id,
          date: selectedDate?.toISOString().split('T')[0],
          time: selectedTime,
          customerName: bookingData.name,
          customerEmail: bookingData.email,
          customerPhone: bookingData.phone,
          notes: bookingData.notes,
        }),
      });

      if (response.ok) {
        alert('Demande enregistrée. Vous recevrez un email de confirmation dès validation.');
        router.push('/booking');
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de la réservation');
      }
    } catch (error) {
      console.error('Failed to create booking:', error);
      alert('Erreur lors de la réservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-gray-600 text-lg">Chargement...</div>
    </div>
  );

  if (!organizer) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-red-600">Expert non trouvé</div>
    </div>
  );

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <Button
          onClick={() => router.push('/booking')}
          variant="ghost"
          className="mb-6 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar
                    src={organizer.avatar_url}
                    initials={getInitials(organizer.name)}
                    size="xl"
                    status="online"
                  />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{organizer.name}</h2>
                    <p className="text-sm text-gray-600">{organizer.specialty || 'Expert EIZO'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>30 min de rendez-vous</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>En ligne</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={previousMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-xl font-semibold text-gray-900 capitalize">{monthName}</h3>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {days.map((date, index) => {
                    if (!date) return <div key={index} />;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    const isPast = date < today;
                    const isToday = date.toDateString() === today.toDateString();

                    return (
                      <button
                        key={index}
                        onClick={() => !isPast && handleDateClick(date)}
                        disabled={isPast}
                        className={`p-3 rounded-lg text-center transition-all ${
                          isSelected
                            ? 'bg-[#0066cc] text-white shadow-md'
                            : isToday
                            ? 'bg-blue-100 text-[#0066cc] font-semibold'
                            : isPast
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {selectedDate && availableDays.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Créneaux disponibles - {availableDays[0].dayName}
                  </h3>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {availableDays[0].slots.map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => slot.available && handleTimeClick(slot.time)}
                        disabled={!slot.available}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          selectedTime === slot.time
                            ? 'border-[#0066cc] bg-blue-50 text-[#0066cc]'
                            : slot.available
                            ? 'border-gray-200 hover:border-[#0066cc] text-gray-700'
                            : 'border-gray-100 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer le rendez-vous</DialogTitle>
              <DialogDescription>
                {selectedDate?.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {selectedTime}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet</label>
                <input
                  type="text"
                  value={bookingData.name}
                  onChange={(e) => setBookingData({ ...bookingData, name: e.target.value })}
                  placeholder="Votre nom"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={bookingData.email}
                  onChange={(e) => setBookingData({ ...bookingData, email: e.target.value })}
                  placeholder="votre@email.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  required
                  value={bookingData.phone}
                  onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
                  placeholder="+33 6 12 34 56 78"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optionnel)</label>
                <textarea
                  value={bookingData.notes}
                  onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                  placeholder="Détails supplémentaires..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                />
              </div>
              <Button
                onClick={handleBookingSubmit}
                disabled={isSubmitting}
                className="w-full bg-[#0066cc] hover:bg-[#0052a3] text-white font-medium"
              >
                {isSubmitting ? 'Confirmation...' : 'Confirmer le rendez-vous'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
