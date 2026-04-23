import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFamily } from '@/lib/familyContext';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import MonthView from '@/components/calendar/MonthView';
import WeekView from '@/components/calendar/WeekView';
import DayView from '@/components/calendar/DayView';
import AddEventSheet from '@/components/calendar/AddEventSheet';
import SkeletonCard from '@/components/shared/SkeletonCard';
import { format, isSameDay } from 'date-fns';

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

  const selectedDayEventCount = useMemo(
    () => events.filter((e) => isSameDay(new Date(e.date + 'T00:00:00'), selectedDay)).length,
    [events, selectedDay]
  );

  const currentDayEventCount = useMemo(
    () => events.filter((e) => isSameDay(new Date(e.date + 'T00:00:00'), currentDate)).length,
    [events, currentDate]
  );

  if (isLoading) return <SkeletonCard count={5} />;

  return (
    <div
      className="min-h-0"
      style={{
        background: 'linear-gradient(180deg, rgba(47,157,182,0.04) 0%, transparent 300px)',
      }}
    >
      <CalendarHeader
        view={view}
        setView={setView}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
      >
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={handleAddEvent}
            className="bg-primary text-white font-semibold text-sm px-4 py-1.5 rounded-full shadow-sm"
          >
            + Event
          </button>
        </div>
      </CalendarHeader>

      {view === 'month' && (
        <>
          <MonthView currentDate={currentDate} events={events} onDayClick={handleDayClick} selectedDay={selectedDay} />
          <div className="mt-4">
            {selectedDayEventCount > 0 && (
              <div
                className="rounded-xl px-4 py-3 mb-2 font-semibold text-sm text-purple-700"
                style={{ background: '#f3f0ff', border: '1px solid #e9d5ff' }}
              >
                {selectedDayEventCount} event{selectedDayEventCount !== 1 ? 's' : ''}
              </div>
            )}
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
        <WeekView
          currentDate={currentDate}
          events={events}
          onDayClick={handleDayClick}
          onDeleteEvent={(id) => deleteEvent.mutate(id)}
          onEditEvent={handleEditEvent}
        />
      )}
      {view === 'day' && (
        <>
          {currentDayEventCount > 0 && (
            <p className="text-xs text-muted-foreground mb-4">
              {currentDayEventCount} event{currentDayEventCount !== 1 ? 's' : ''}
            </p>
          )}
          <DayView
            currentDate={currentDate}
            events={events}
            onDeleteEvent={(id) => deleteEvent.mutate(id)}
            onEditEvent={handleEditEvent}
          />
        </>
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
