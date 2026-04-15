import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFamily } from '@/lib/familyContext';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import MonthView from '@/components/calendar/MonthView';
import WeekView from '@/components/calendar/WeekView';
import DayView from '@/components/calendar/DayView';
import AddEventSheet from '@/components/calendar/AddEventSheet';
import SkeletonCard from '@/components/shared/SkeletonCard';
import { format } from 'date-fns';

export default function CalendarPage() {
  const { family, currentUser } = useFamily();
  const queryClient = useQueryClient();
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', family?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('family_id', family?.id)
        .order('date', { ascending: true });
      return data || [];
    },
    enabled: !!family?.id,
  });

  const createEvent = useMutation({
    mutationFn: async (data) => {
      const { data: newEvent, error } = await supabase
        .from('events')
        .insert({ ...data, family_id: family.id, user_id: currentUser.id })
        .select()
        .single();
      if (error) throw error;
      return newEvent;
    },
    onSuccess: async (newEvent) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      await supabase.from('feed_items').insert({
        family_id: family.id,
        user_id: currentUser.id,
        user_name: currentUser.display_name || currentUser.full_name,
        user_avatar: currentUser.avatar,
        type: 'event_added',
        message: `${currentUser.display_name || currentUser.full_name} added "${newEvent.title}" on ${format(new Date(newEvent.date), 'MMM d')}`,
      });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id) => {
      await supabase.from('events').delete().eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const handleDayClick = (day) => {
    setCurrentDate(day);
    setView('day');
  };

  const handleAddEvent = () => {
    setSelectedDate(currentDate);
    setShowAddEvent(true);
  };

  if (isLoading) return <SkeletonCard count={5} />;

  return (
    <div>
      <CalendarHeader
        view={view}
        setView={setView}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        onAddEvent={handleAddEvent}
      />

      {view === 'month' && (
        <MonthView currentDate={currentDate} events={events} onDayClick={handleDayClick} />
      )}
      {view === 'week' && (
        <WeekView currentDate={currentDate} events={events} onDayClick={handleDayClick} />
      )}
      {view === 'day' && (
        <DayView currentDate={currentDate} events={events} onDeleteEvent={(id) => deleteEvent.mutate(id)} />
      )}

      <AddEventSheet
        open={showAddEvent}
        onClose={() => setShowAddEvent(false)}
        onSave={(data) => createEvent.mutateAsync(data)}
        selectedDate={selectedDate}
      />
    </div>
  );
}