'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Calendar, Clock, MapPin, ArrowLeft, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { siteConfig } from '@/lib/config';
import gsap from 'gsap';

interface Organizer {
  id: string;
  name: string;
  email: string;
  specialty: string;
  avatar_url?: string;
  slot_duration_minutes?: number;
  working_days?: Record<string, { start: string; end: string }[]>;
  description?: string;
  event_start_date?: string;
  event_end_date?: string;
  venue_name?: string;
  venue_location?: string;
  booth?: string;
}

interface TimeSlot {
  time: string;
  end: string;
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
  const [monthSlots, setMonthSlots] = useState<Record<string, any[]>>({});
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingData, setBookingData] = useState({ name: '', email: '', phone: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');

  const cardsRef = useRef<HTMLDivElement[]>([]);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bookingSuccess || !successRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const context = gsap.context(() => {
      gsap.fromTo(successRef.current, { opacity: 0, y: 28, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.5)' });
      gsap.fromTo(successRef.current?.children || [], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.07, delay: 0.18, ease: 'power2.out' });
    }, successRef);
    return () => context.revert();
  }, [bookingSuccess]);

  useEffect(() => {
    fetchOrganizer();
    const requestedLanguage = new URLSearchParams(window.location.search).get('lang');
    const pageLanguage = document.documentElement.lang || navigator.language;
    setLanguage(requestedLanguage === 'en' || (!requestedLanguage && pageLanguage.toLowerCase().startsWith('en')) ? 'en' : 'fr');
  }, [params.id]);

  const fetchOrganizer = async () => {
    try {
      const response = await fetch(`/api/public/organizers/${params.id}`);
      const data = await response.json();
      setOrganizer(data);
      if (data.event_start_date) {
        const [year, month] = data.event_start_date.split('-').map(Number);
        setCurrentMonth(new Date(year, month - 1, 1));
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch organizer:', error);
      setLoading(false);
    }
  };

  const fetchMonthSlots = async (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    try {
      const response = await fetch(`/api/public/availability/${params.id}?month=${year}-${month}`);
      const data = await response.json();
      setMonthSlots(data.dates || {});
    } catch (error) {
      console.error('Failed to fetch month slots:', error);
      setMonthSlots({});
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchMonthSlots(currentMonth);
    }
  }, [currentMonth, params.id]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (t: string) => t ? t.slice(0, 5) : '';
  const formatSlot = (slot: TimeSlot) => `${formatTime(slot.time)} - ${formatTime(slot.end)}`;
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

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
    const dateStr = formatLocalDate(date);
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
      alert(isEnglish ? 'Please enter your name, email and phone number.' : 'Veuillez renseigner votre nom, email et téléphone.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizerId: params.id,
          date: selectedDate ? formatLocalDate(selectedDate) : undefined,
          time: selectedTime,
          customerName: bookingData.name,
          customerEmail: bookingData.email,
          customerPhone: bookingData.phone,
          notes: bookingData.notes,
          language,
        }),
      });

      if (response.ok) {
        if (isIbc) {
          setIsBookingModalOpen(false);
          setBookingSuccess(true);
        } else {
          alert('Demande enregistrée. Vous recevrez un email de confirmation dès validation.');
          router.push('/booking');
        }
      } else {
        const error = await response.json();
        alert(error.error || (isEnglish ? 'Unable to book this appointment' : 'Erreur lors de la réservation'));
      }
    } catch (error) {
      console.error('Failed to create booking:', error);
      alert(isEnglish ? 'Unable to book this appointment' : 'Erreur lors de la réservation');
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
  const isIbc = params.id === 'ibc-2026';
  const isEnglish = isIbc && language === 'en';
  const locale = isEnglish ? 'en-GB' : 'fr-FR';
  const isEvent = isIbc || Boolean(organizer.event_start_date && organizer.event_end_date);
  const eventStartDate = organizer.event_start_date || (isIbc ? '2026-09-11' : undefined);
  const eventEndDate = organizer.event_end_date || (isIbc ? '2026-09-14' : undefined);
  const eventDates = eventStartDate && eventEndDate
    ? `${new Date(`${eventStartDate}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long' })} – ${new Date(`${eventEndDate}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}`
    : null;
  const eventDays = isIbc ? [11, 12, 13, 14].map(day => new Date(2026, 8, day)) : [];
  const exhibits = organizer.description?.split('|').filter(Boolean) || [];

  return (
    <div className={isIbc ? 'min-h-screen bg-[radial-gradient(circle_at_top_right,_#dbeafe_0,_#f8fafc_38%,_#f1f5f9_100%)]' : 'min-h-screen bg-gradient-to-br from-blue-50 to-white'}>
      <div className={`mx-auto max-w-6xl ${isIbc ? 'px-5 py-7 sm:px-7 sm:py-8' : 'px-6 py-12'}`}>
        {!isIbc && (
          <Button
            onClick={() => router.push('/booking')}
            variant="ghost"
            className="mb-6 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        )}

        {bookingSuccess && isIbc ? (
          <div className="mx-auto flex min-h-[620px] max-w-2xl items-center justify-center px-4">
            <div ref={successRef} className="w-full rounded-3xl border border-emerald-100 bg-white p-10 text-center shadow-2xl shadow-slate-200/80">
              <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-inner">
                <Check className="h-12 w-12" strokeWidth={2.5} />
              </div>
              <img src="https://eizo.fr/cdn/shop/files/EIZO-Logo_RGB.png?v=1732704479&width=310" alt="EIZO" className="mx-auto mb-8 h-auto w-32" />
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#0066cc]">IBC 2026</p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">{isEnglish ? 'Request successfully submitted' : 'Demande envoyée avec succès'}</h1>
              <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-slate-600">
                {isEnglish ? 'Your appointment request has been sent to the EIZO team. You will receive an email as soon as it has been confirmed.' : 'Votre demande de rendez-vous a été transmise à l’équipe EIZO. Vous recevrez un email dès qu’elle aura été confirmée.'}
              </p>
              <div className="mt-8 rounded-2xl bg-slate-50 px-6 py-5 text-sm text-slate-600">
                <strong className="text-slate-900">RAI Amsterdam</strong><br />
                Amsterdam, the Netherlands · {isEnglish ? 'Booth' : 'Stand'} 7.D33
              </div>
            </div>
          </div>
        ) : (
        <div className={`grid grid-cols-1 gap-5 ${isIbc ? 'gap-6 md:grid-cols-[320px_minmax(0,1fr)]' : 'lg:grid-cols-3 lg:gap-8'}`}>
          <div className={isIbc ? '' : 'lg:col-span-1'}>
            <Card className={isIbc ? 'h-full !border-0 bg-transparent shadow-none' : 'sticky top-6'}>
              <CardContent className={isIbc ? 'flex h-full flex-col gap-5 p-0' : 'p-6'}>
                <div className={isIbc ? 'mb-0 flex items-center gap-4 rounded-3xl bg-gradient-to-br from-[#071c36] via-[#0b315c] to-[#0066cc] p-6 text-white shadow-[0_20px_45px_-22px_rgba(0,66,130,0.75)]' : 'mb-6 flex items-center gap-4'}>
                  {isIbc ? (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-slate-50 p-3 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70">
                      <img
                        src="https://eizo.fr/cdn/shop/files/EIZO-Logo_RGB.png?v=1732704479&width=310"
                        alt="EIZO"
                        className="h-auto w-full"
                      />
                    </div>
                  ) : (
                    <Avatar
                      src={organizer.avatar_url}
                      initials={getInitials(organizer.name)}
                      size="xl"
                    />
                  )}
                  <div>
                    <h2 className={`text-xl font-semibold ${isIbc ? 'text-white' : 'text-gray-900'}`}>{organizer.name === 'Fred ROL' ? 'Notre expert EIZO' : organizer.name}</h2>
                    <p className={`text-sm ${isIbc ? 'text-blue-100' : 'text-gray-600'}`}>{organizer.specialty || 'Expert EIZO'}</p>
                  </div>
                </div>
                <div className={isIbc ? 'grid grid-cols-1 gap-4' : 'space-y-3'}>
                  <div className={isIbc ? 'flex items-center gap-3 rounded-2xl bg-white p-5 text-sm text-slate-600 shadow-sm' : 'flex items-center gap-2 text-sm text-gray-600'}>
                    <Clock className="w-4 h-4" />
                    <span>{organizer.slot_duration_minutes === 60 ? (isEnglish ? '1-hour appointment' : '1 heure de rendez-vous') : `${organizer.slot_duration_minutes || 60} min${isEnglish ? ' appointment' : ' de rendez-vous'}`}</span>
                  </div>
                  <div className={isIbc ? 'flex items-center gap-3 rounded-2xl bg-[#ddecff] p-5 text-sm font-medium text-[#064b8e]' : 'flex items-center gap-2 text-sm text-gray-600'}>
                    <MapPin className="w-4 h-4" />
                    <span>{organizer.venue_name || (isIbc ? 'RAI Amsterdam' : siteConfig.showroom.name)}</span>
                    {isIbc && (
                      <a href="https://www.google.com/maps/search/?api=1&query=RAI%20Amsterdam%2C%20Amsterdam%2C%20the%20Netherlands" target="_blank" rel="noreferrer" className="ml-auto text-xs font-bold text-[#0066cc] hover:underline">
                        Google Maps ↗
                      </a>
                    )}
                  </div>
                  <div className={isIbc ? 'flex items-center gap-3 rounded-2xl bg-white p-5 text-sm text-slate-600 shadow-sm' : 'flex items-center gap-2 text-sm text-gray-600'}>
                    <Calendar className="w-4 h-4" />
                    <span>{eventDates || 'En présentiel'}</span>
                  </div>
                  {(organizer.venue_location || isIbc) && (
                    <div className={isIbc ? 'rounded-2xl bg-[#0066cc] p-5 text-sm font-medium leading-6 text-white shadow-[0_14px_30px_-18px_rgba(0,102,204,0.8)]' : 'text-sm text-gray-600'}>
                      {organizer.venue_location || 'Amsterdam, the Netherlands'} · {isEnglish ? 'Booth' : 'Stand'} {organizer.booth || '7.D33'}
                    </div>
                  )}
                </div>
                {isEvent && exhibits.length > 0 && (
                  <div className={isIbc ? 'flex flex-1 flex-col rounded-3xl bg-white p-6 shadow-sm' : 'mt-6 border-t border-gray-200 pt-5'}>
                    <h3 className="mb-4 text-sm font-semibold text-gray-900">{isEnglish ? 'Products on display' : 'Produits présentés'}</h3>
                    <ul className="space-y-3 text-sm leading-6 text-gray-600">
                      {exhibits.map((exhibit) => <li key={exhibit}>• {exhibit}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className={isIbc ? 'flex h-full min-w-0 flex-col gap-5' : 'lg:col-span-2 space-y-6'}>
            <Card className={isIbc ? 'rounded-3xl !border-0 bg-white/95 shadow-[0_20px_55px_-24px_rgba(15,23,42,0.28)] backdrop-blur' : ''} style={isIbc ? { border: 'none' } : undefined}>
              <CardContent className="p-6">
                {isIbc ? (
                  <div>
                    <div className="mb-6">
                      <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#0066cc]">IBC 2026</p>
                      <h3 className="text-2xl font-semibold text-gray-900">{isEnglish ? 'Choose your day' : 'Choisissez votre journée'}</h3>
                      <p className="mt-2 text-sm text-gray-500">{isEnglish ? 'Available September 11–14, 2026 only' : 'Uniquement du 11 au 14 septembre 2026'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {eventDays.map((date) => {
                        const dateStr = formatLocalDate(date);
                        const hasAvailable = (monthSlots[dateStr] || []).some(slot => slot.available);
                        const isSelected = selectedDate?.toDateString() === date.toDateString();
                        return (
                          <button
                            key={dateStr}
                            type="button"
                            onClick={() => hasAvailable && handleDateClick(date)}
                            disabled={!hasAvailable}
                            className={`group rounded-2xl border p-5 text-left transition-all duration-300 ${
                              isSelected
                                ? 'border-transparent bg-gradient-to-br from-[#0074d9] to-[#0053a6] text-white shadow-[0_16px_30px_-12px_rgba(0,102,204,0.65)] ring-1 ring-blue-400/20'
                                : hasAvailable
                                ? 'border-slate-200/80 bg-white hover:-translate-y-1.5 hover:border-blue-300 hover:shadow-[0_16px_30px_-16px_rgba(0,102,204,0.45)]'
                                : 'cursor-not-allowed border-slate-100 bg-slate-50/70 text-slate-400'
                            }`}
                          >
                            <span className={`block text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-blue-100' : 'text-[#0066cc]'}`}>
                              {date.toLocaleDateString(locale, { weekday: 'long' })}
                            </span>
                            <span className="mt-3 block text-3xl font-bold">{date.getDate()}</span>
                            <span className={`mt-1 block text-sm ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>{isEnglish ? 'September' : 'septembre'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <>
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
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
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
                    const dateStr = formatLocalDate(date);
                    const slots = monthSlots[dateStr] || [];
                    const hasAvailable = slots.some(s => s.available);
                    const isDisabled = isPast || !hasAvailable;

                    return (
                      <button
                        key={index}
                        onClick={() => !isDisabled && handleDateClick(date)}
                        disabled={isDisabled}
                        className={`p-3 rounded-lg text-center transition-all ${
                          isSelected
                            ? 'bg-[#0066cc] text-white shadow-md'
                            : isToday
                            ? 'bg-blue-100 text-[#0066cc] font-semibold'
                            : isDisabled
                            ? 'text-gray-300 cursor-not-allowed bg-transparent'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
                  </>
                )}
              </CardContent>
            </Card>

            {isIbc && !selectedDate && (
              <Card className="min-h-[330px] flex-1 rounded-3xl !border-0 bg-gradient-to-br from-[#071c36] via-[#0b315c] to-[#0066cc] text-white shadow-[0_24px_60px_-28px_rgba(0,66,130,0.75)]" style={{ border: 'none' }}>
                <CardContent className="flex h-full flex-col justify-between p-8">
                  <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-blue-200">{isEnglish ? 'Plan your visit' : 'Préparez votre visite'}</p>
                    <h3 className="max-w-lg text-2xl font-semibold leading-tight">{isEnglish ? 'Select one of the four event days to view available appointments.' : 'Sélectionnez l’une des quatre journées pour afficher les rendez-vous disponibles.'}</h3>
                  </div>
                  <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/15">
                      <p className="text-sm font-semibold">{isEnglish ? 'Friday' : 'Vendredi'}</p>
                      <p className="mt-1 text-sm text-blue-100">10:30 – 17:30</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/15">
                      <p className="text-sm font-semibold">{isEnglish ? 'Saturday & Sunday' : 'Samedi & dimanche'}</p>
                      <p className="mt-1 text-sm text-blue-100">10:00 – 17:30</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/15">
                      <p className="text-sm font-semibold">{isEnglish ? 'Monday' : 'Lundi'}</p>
                      <p className="mt-1 text-sm text-blue-100">10:00 – 16:00</p>
                    </div>
                    <a href="https://www.google.com/maps/search/?api=1&query=RAI%20Amsterdam%2C%20Amsterdam%2C%20the%20Netherlands" target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl bg-white p-5 text-sm font-bold text-[#064b8e] transition-transform hover:-translate-y-0.5">
                      <span>RAI Amsterdam</span><span>Google Maps ↗</span>
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedDate && availableDays.length > 0 && (
              <Card className={isIbc ? 'flex-1 rounded-3xl !border-0 bg-white/95 shadow-[0_20px_55px_-24px_rgba(15,23,42,0.28)] backdrop-blur' : ''} style={isIbc ? { border: 'none' } : undefined}>
                <CardContent className={isIbc ? 'p-7' : 'p-6'}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {isEnglish ? 'Available times' : 'Créneaux disponibles'} - {selectedDate?.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {availableDays[0].slots.map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => slot.available && handleTimeClick(slot.time)}
                        disabled={!slot.available}
                        className={`rounded-xl px-3 py-3.5 text-sm font-medium transition-all duration-200 ${
                          selectedTime === slot.time
                            ? 'bg-[#0066cc] text-white shadow-lg shadow-blue-200'
                            : slot.available
                            ? 'bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200 hover:-translate-y-0.5 hover:bg-white hover:text-[#0066cc] hover:ring-blue-300 hover:shadow-md'
                            : 'cursor-not-allowed bg-slate-50 text-slate-300 ring-1 ring-inset ring-slate-100'
                        }`}
                      >
                        {formatSlot(slot)}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        )}

        <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEnglish ? 'Confirm your appointment' : 'Confirmer le rendez-vous'}</DialogTitle>
              <DialogDescription>
                {selectedDate?.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })} {isEnglish ? 'at' : 'à'} {selectedTime}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{isEnglish ? 'Full name' : 'Nom complet'}</label>
                <input
                  type="text"
                  value={bookingData.name}
                  onChange={(e) => setBookingData({ ...bookingData, name: e.target.value })}
                  placeholder={isEnglish ? 'Your name' : 'Votre nom'}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">{isEnglish ? 'Phone' : 'Téléphone'} <span className="text-red-500">*</span></label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">{isEnglish ? 'Notes (optional)' : 'Notes (optionnel)'}</label>
                <textarea
                  value={bookingData.notes}
                  onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                  placeholder={isEnglish ? 'Additional details...' : 'Détails supplémentaires...'}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                />
              </div>
              <Button
                onClick={handleBookingSubmit}
                disabled={isSubmitting}
                className="w-full bg-[#0066cc] hover:bg-[#0052a3] text-white font-medium"
              >
                {isSubmitting ? (isEnglish ? 'Confirming...' : 'Confirmation...') : (isEnglish ? 'Confirm appointment' : 'Confirmer le rendez-vous')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
