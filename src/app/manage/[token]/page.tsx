'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, MapPin, Phone, Mail } from 'lucide-react';
import { siteConfig } from '@/lib/config';

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  requested_product?: { title?: string } | null;
  customer_usage?: string | null;
  customer_need?: string | null;
  customer_notes?: string | null;
  management_token: string;
}

interface Organizer {
  name: string;
  slug: string;
}

export default function ManageBookingPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchBooking();
  }, [token]);

  useEffect(() => {
    if (selectedDate && organizer?.slug) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate, organizer?.slug]);

  const fetchBooking = async () => {
    try {
      const response = await fetch(`/api/public/manage/${token}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur');
      setBooking(data.booking);
      setOrganizer(data.organizer);
      if (data.booking) {
        setSelectedDate(data.booking.date);
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de charger le rendez-vous.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async (date: string) => {
    try {
      const response = await fetch(`/api/public/availability/${organizer?.slug}?date=${date}`);
      const data = await response.json();
      setAvailableSlots(data.slots || []);
      setSelectedTime('');
    } catch (err) {
      setAvailableSlots([]);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (time: string) => time.slice(0, 5);

  const handleCancel = async () => {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ?')) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/public/manage/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur');
      setMessage('Votre rendez-vous a été annulé. Vous allez être redirigé pour prendre un autre créneau.');
      setBooking(prev => prev ? { ...prev, status: 'cancelled' } : null);
      setTimeout(() => {
        window.location.href = `${siteConfig.appUrl}/booking/${organizer?.slug || 'coloredge'}`;
      }, 2000);
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors de l\'annulation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      setMessage('Veuillez choisir une date et un créneau.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/public/manage/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, time: selectedTime }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur');
      setMessage('Votre demande de modification a bien été enregistrée et est en attente de validation.');
      setBooking(data.booking);
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors de la modification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-lg">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (!booking) return null;

  const isActive = ['pending', 'confirmed'].includes(booking.status);
  const demo = booking.requested_product?.title || booking.customer_need || 'ColorEdge';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-12 px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900 text-center">Votre rendez-vous EIZO ColorEdge</h1>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-[#0066cc] mt-1" />
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium text-gray-900">{formatDate(booking.date)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#0066cc] mt-1" />
              <div>
                <p className="text-sm text-gray-500">Heure</p>
                <p className="font-medium text-gray-900">{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#0066cc] mt-1" />
              <div>
                <p className="text-sm text-gray-500">Lieu</p>
                <p className="font-medium text-gray-900">{siteConfig.showroom.name}</p>
                <p className="text-sm text-gray-600">{siteConfig.showroom.address.street}</p>
                <p className="text-sm text-gray-600">{siteConfig.showroom.address.postalCode} {siteConfig.showroom.address.city}</p>
                <a href={siteConfig.showroom.googleMapsUrl} target="_blank" className="text-sm text-[#0066cc] hover:underline">Voir sur Google Maps</a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#0066cc] mt-1" />
              <div>
                <p className="text-sm text-gray-500">Démonstration</p>
                <p className="font-medium text-gray-900">{demo}</p>
              </div>
            </div>
            {siteConfig.contact.phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#0066cc] mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Téléphone</p>
                  <p className="font-medium text-gray-900">{siteConfig.contact.phone}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isActive && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Modifier le créneau</h2>
              <p className="text-sm text-gray-600">Choisissez une nouvelle date. Votre demande repassera en attente de validation.</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nouvelle date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                />
              </div>

              {availableSlots.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau créneau</label>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {availableSlots.map((slot, index) => (
                      <button
                        key={index}
                        disabled={!slot.available}
                        onClick={() => slot.available && setSelectedTime(slot.time)}
                        className={`p-3 rounded-lg border-2 text-sm font-medium ${
                          selectedTime === slot.time
                            ? 'border-[#0066cc] bg-blue-50 text-[#0066cc]'
                            : slot.available
                            ? 'border-gray-200 hover:border-[#0066cc] text-gray-700'
                            : 'border-gray-100 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        {slot.time.slice(0, 5)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleReschedule}
                disabled={isSubmitting || !selectedTime}
                className="w-full bg-[#0066cc] hover:bg-[#0052a3] text-white"
              >
                {isSubmitting ? 'Enregistrement...' : 'Modifier le créneau'}
              </Button>
            </CardContent>
          </Card>
        )}

        {isActive && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Annuler le rendez-vous</h2>
              <Button
                onClick={handleCancel}
                disabled={isSubmitting}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {isSubmitting ? 'Annulation...' : 'Annuler mon rendez-vous'}
              </Button>
            </CardContent>
          </Card>
        )}

        {message && (
          <div className="p-4 rounded-xl bg-gray-100 text-center text-gray-800">{message}</div>
        )}
      </div>
    </div>
  );
}
