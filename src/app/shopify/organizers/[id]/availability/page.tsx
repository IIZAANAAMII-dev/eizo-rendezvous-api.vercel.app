'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Trash2, Clock, Calendar, ChevronRight, Check } from 'lucide-react';
import gsap from 'gsap';

interface AvailabilitySlot {
  id?: string;
  availability_id?: string;
  start_time: string;
  end_time: string;
}

interface DayAvailability {
  id?: string;
  day_of_week: number;
  is_available: boolean;
  availability_slots?: AvailabilitySlot[];
}

interface AvailabilityException {
  id: string;
  date: string;
  start_time?: string;
  end_time?: string;
  type: 'unavailable' | 'override';
  reason?: string;
}

export default function AvailabilitySettings() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [newSlot, setNewSlot] = useState({ start_time: '09:00', end_time: '12:00' });
  const [newException, setNewException] = useState({ date: '', type: 'unavailable' as 'unavailable' | 'override', reason: '' });

  const pageRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);

  const shop = searchParams.get('shop');
  const organizerId = params.id as string;

  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/availability/${organizerId}?shop=${shop}`).then(res => res.json()),
      fetch(`/api/admin/availability-exceptions/${organizerId}?shop=${shop}`).then(res => res.json()),
    ]).then(([availabilityData, exceptionsData]) => {
      setAvailability(availabilityData || []);
      setExceptions(exceptionsData || []);
      setLoading(false);
      
      // GSAP animation for cards
      gsap.fromTo(cardsRef.current, 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
      );
    });
  }, [organizerId, shop]);

  const handleSelectDay = (dayIndex: number) => {
    setSelectedDay(dayIndex);
    const dayData = availability.find(a => a.day_of_week === dayIndex);
    if (!dayData || !dayData.is_available) {
      // Activer le jour s'il n'est pas actif
      const updated = [...availability];
      const existingIndex = updated.findIndex(a => a.day_of_week === dayIndex);
      if (existingIndex >= 0) {
        updated[existingIndex] = { ...updated[existingIndex], is_available: true, availability_slots: updated[existingIndex].availability_slots || [] };
      } else {
        updated.push({ day_of_week: dayIndex, is_available: true, availability_slots: [] });
      }
      setAvailability(updated);
    }
  };

  const handleToggleDayAvailability = (dayIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...availability];
    const existingIndex = updated.findIndex(a => a.day_of_week === dayIndex);
    if (existingIndex >= 0) {
      updated[existingIndex] = { ...updated[existingIndex], is_available: !updated[existingIndex].is_available };
      if (!updated[existingIndex].is_available && selectedDay === dayIndex) {
        setSelectedDay(null);
      }
    } else {
      updated.push({ day_of_week: dayIndex, is_available: true, availability_slots: [] });
    }
    setAvailability(updated);
  };

  const handleAddTimeSlot = () => {
    if (selectedDay === null) return;
    setNewSlot({ start_time: '09:00', end_time: '12:00' });
    setIsSlotModalOpen(true);
  };

  const handleSaveSlot = () => {
    if (selectedDay === null) return;
    
    const updated = [...availability];
    const existingIndex = updated.findIndex(a => a.day_of_week === selectedDay);
    if (existingIndex >= 0) {
      updated[existingIndex] = {
        ...updated[existingIndex],
        availability_slots: [...(updated[existingIndex].availability_slots || []), { ...newSlot }]
      };
    } else {
      updated.push({ day_of_week: selectedDay, is_available: true, availability_slots: [{ ...newSlot }] });
    }
    setAvailability(updated);
    setIsSlotModalOpen(false);
  };

  const handleRemoveTimeSlot = (slotIndex: number) => {
    if (selectedDay === null) return;
    const updated = [...availability];
    const existingIndex = updated.findIndex(a => a.day_of_week === selectedDay);
    if (existingIndex >= 0) {
      updated[existingIndex] = {
        ...updated[existingIndex],
        availability_slots: updated[existingIndex].availability_slots?.filter((_, i) => i !== slotIndex) || []
      };
    }
    setAvailability(updated);
  };

  const handleTimeSlotChange = (slotIndex: number, field: 'start_time' | 'end_time', value: string) => {
    if (selectedDay === null) return;
    const updated = [...availability];
    const existingIndex = updated.findIndex(a => a.day_of_week === selectedDay);
    if (existingIndex >= 0) {
      const newTimeSlots = [...(updated[existingIndex].availability_slots || [])];
      newTimeSlots[slotIndex] = { ...newTimeSlots[slotIndex], [field]: value };
      updated[existingIndex] = { ...updated[existingIndex], availability_slots: newTimeSlots };
    }
    setAvailability(updated);
  };

  const handleAddException = () => {
    setNewException({ date: '', type: 'unavailable', reason: '' });
    setIsExceptionModalOpen(true);
  };

  const handleSaveException = () => {
    fetch(`/api/admin/availability-exceptions/${organizerId}?shop=${shop}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newException),
    })
      .then(res => res.json())
      .then(data => {
        setExceptions([...exceptions, data]);
        setIsExceptionModalOpen(false);
      });
  };

  const handleDeleteException = (exceptionId: string) => {
    fetch(`/api/admin/availability-exceptions/${organizerId}?shop=${shop}&exceptionId=${exceptionId}`, {
      method: 'DELETE',
    })
      .then(() => {
        setExceptions(exceptions.filter(e => e.id !== exceptionId));
      });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const day of availability) {
        await fetch(`/api/admin/availability/${organizerId}?shop=${shop}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(day),
        });
      }
      alert('Disponibilité sauvegardée');
    } catch (error) {
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-gray-600 text-lg">Chargement...</div>
    </div>
  );

  const selectedDayData = selectedDay !== null ? availability.find(a => a.day_of_week === selectedDay) : null;

  return (
    <div ref={pageRef} className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => router.push(`/shopify/organizers/${organizerId}?shop=${shop}`)}
            variant="ghost"
            className="text-gray-600 hover:text-gray-900"
          >
            ← Retour
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Disponibilités</h1>
            <p className="text-gray-600 mt-2 text-lg">Configurez vos horaires de disponibilité</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sélection des jours */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Jours de la semaine</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {days.map((day, index) => {
                    const dayData = availability.find(a => a.day_of_week === index);
                    const isSelected = selectedDay === index;
                    const isAvailable = dayData?.is_available;
                    
                    return (
                      <div
                        key={index}
                        onClick={() => handleSelectDay(index)}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                          isSelected 
                            ? 'border-[#0066cc] bg-blue-50' 
                            : isAvailable 
                              ? 'border-[#0066cc] bg-white' 
                              : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <span className={`font-medium ${isSelected ? 'text-[#0066cc]' : isAvailable ? 'text-gray-900' : 'text-gray-400'}`}>
                          {day}
                        </span>
                        <button
                          onClick={(e) => handleToggleDayAvailability(index, e)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isAvailable ? 'border-[#0066cc] bg-[#0066cc]' : 'border-gray-300'
                          }`}
                        >
                          {isAvailable && <Check className="w-4 h-4 text-white" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Configuration des horaires */}
          <div className="lg:col-span-2">
            {selectedDay !== null ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">
                      {days[selectedDay]} - Horaires
                    </CardTitle>
                    <Button 
                      onClick={handleSave} 
                      disabled={saving}
                      className="bg-[#0066cc] hover:bg-[#0052a3] text-white font-medium px-6"
                    >
                      {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedDayData?.availability_slots && selectedDayData.availability_slots.length > 0 ? (
                    <div className="space-y-3">
                      {selectedDayData.availability_slots.map((slot, slotIndex) => (
                        <div key={slot.id || slotIndex} className="flex items-center gap-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <Clock className="w-5 h-5 text-gray-400" />
                          <input
                            type="time"
                            value={slot.start_time}
                            onChange={(e) => handleTimeSlotChange(slotIndex, 'start_time', e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                          />
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                          <input
                            type="time"
                            value={slot.end_time}
                            onChange={(e) => handleTimeSlotChange(slotIndex, 'end_time', e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                          />
                          <Button
                            onClick={() => handleRemoveTimeSlot(slotIndex)}
                            variant="ghost"
                            size="sm"
                            className="ml-auto text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p>Aucun horaire configuré</p>
                    </div>
                  )}
                  
                  <Button
                    onClick={handleAddTimeSlot}
                    variant="outline"
                    className="w-full mt-4 border-[#0066cc] text-[#0066cc] hover:bg-blue-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un créneau horaire
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Sélectionnez un jour</h3>
                  <p className="text-gray-600">Cliquez sur un jour pour configurer ses horaires de disponibilité</p>
                </CardContent>
              </Card>
            )}

            {/* Exceptions */}
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Exceptions calendrier</CardTitle>
                  <Button
                    onClick={handleAddException}
                    variant="outline"
                    className="border-[#0066cc] text-[#0066cc] hover:bg-blue-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter exception
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {exceptions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p>Aucune exception configurée</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {exceptions.map((exception) => (
                      <div key={exception.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-semibold text-gray-900">{exception.date}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              {exception.type === 'unavailable' ? 'Indisponible' : 'Override'}
                              {exception.reason && ` - ${exception.reason}`}
                            </div>
                          </div>
                          <Button
                            onClick={() => handleDeleteException(exception.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={isSlotModalOpen} onOpenChange={setIsSlotModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un horaire</DialogTitle>
            <DialogDescription>Définissez vos heures de disponibilité pour {selectedDay !== null ? days[selectedDay] : ''}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Heure de début</label>
              <input
                type="time"
                value={newSlot.start_time}
                onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Heure de fin</label>
              <input
                type="time"
                value={newSlot.end_time}
                onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
            </div>
            <Button onClick={handleSaveSlot} className="w-full bg-[#0066cc] hover:bg-[#0052a3] text-white font-medium">
              Ajouter
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isExceptionModalOpen} onOpenChange={setIsExceptionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une exception</DialogTitle>
            <DialogDescription>Définissez une date d'indisponibilité</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={newException.date}
                onChange={(e) => setNewException({ ...newException, date: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={newException.type}
                onChange={(e) => setNewException({ ...newException, type: e.target.value as 'unavailable' | 'override' })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
              >
                <option value="unavailable">Indisponible</option>
                <option value="override">Override</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Raison (optionnel)</label>
              <input
                type="text"
                value={newException.reason}
                onChange={(e) => setNewException({ ...newException, reason: e.target.value })}
                placeholder="Ex: Congés, Formation..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
            </div>
            <Button onClick={handleSaveException} className="w-full bg-[#0066cc] hover:bg-[#0052a3] text-white font-medium">
              Ajouter
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
