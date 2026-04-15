import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function PageNotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <Home className="w-10 h-10 text-primary" />
      </div>
      <h1 className="font-heading text-4xl font-bold mb-2">404</h1>
      <p className="text-muted-foreground mb-6">This page could not be found.</p>
      <Button onClick={() => navigate('/')} className="rounded-xl">
        Go Home
      </Button>
    </div>
  );
}
