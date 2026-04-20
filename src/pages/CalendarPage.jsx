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
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedDay, setSelectedDay] = useState(new Date());

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
      queryClient.invalidateQueries({ queryKey: ['events', family?.id] });
      await supabase.from('feed_items').insert({
        family_id: family.id,
        user_id: currentUser.id,
        user_name: currentUser.display_name || currentUser.full_name,
        user_avatar: currentUser.avatar,
        type: 'event_added',
        message: `${currentUser.display_name || currentUser.full_name} added "${newEvent.title}" on ${format(new Date(newEvent.date + 'T00:00:00'), 'MM/dd/yyyy')}`,
      });
    },
  });

  const updateEvent = useMutation({
    mutationFn: async (data) => {
      const { id, ...updates } = data;
      const { error } = await supabase.from('events').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events', family?.id] }),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id) => {
      await supabase.from('events').delete().eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events', family?.id] }),
  });

  const handleDayClick = (day) => {
    setCurrentDate(day);
    if (view === 'month') {
      setSelectedDay(day);
    } else {
      setView('day');
    }
  };

  const handleAddEvent = () => {
    setEditingEvent(null);
    setSelectedDate(currentDate);
    setShowAddEvent(true);
  };

  const handleCloseSheet = () => {
    setShowAddEvent(false);
    setEditingEvent(null);
  };

  const handleEditEvent = (ev) => {
    setEditingEvent(ev);
    setSelectedDate(new Date(ev.date + 'T00:00:00'));
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
        <>
          <MonthView currentDate={currentDate} events={events} onDayClick={handleDayClick} selectedDay={selectedDay} />
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-foreground">
                {format(selectedDay, 'EEEE, MMMM d')}
              </p>
              <button
                onClick={() => {
                  setCurrentDate(selectedDay);
                  setShowAddEvent(true);
                }}
                className="text-xs text-primary font-medium hover:underline"
              >
                + Add event
              </button>
            </div>
            <DayView
              currentDate={selectedDay}
              events={events}
              onDeleteEvent={(id) => deleteEvent.mutate(id)}
              onEditEvent={handleEditEvent}
            />
          </div>
        </>
      )}
      {view === 'week' && (
        <WeekView currentDate={currentDate} events={events} onDayClick={handleDayClick} />
      )}
      {view === 'day' && (
        <DayView
          currentDate={currentDate}
          events={events}
          onDeleteEvent={(id) => deleteEvent.mutate(id)}
          onEditEvent={handleEditEvent}
        />
      )}

      <AddEventSheet
        open={showAddEvent}
        onClose={handleCloseSheet}
        onCreate={(data) => createEvent.mutateAsync(data)}
        onUpdate={(data) => updateEvent.mutateAsync(data)}
        selectedDate={selectedDate}
        editingEvent={editingEvent}
      />
    </div>
  );
}
