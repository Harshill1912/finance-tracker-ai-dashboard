// SplitExpenseForm.jsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const SplitExpenseForm = () => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [participants, setParticipants] = useState([]);
  const [newParticipantName, setNewParticipantName] = useState('');

  const addParticipant = () => {
    if (!newParticipantName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a participant name",
        variant: "destructive",
      });
      return;
    }

    const share = participants.length === 0 
      ? Number(amount) 
      : Number(amount) / (participants.length + 1);

    setParticipants([
      ...participants,
      { name: newParticipantName, share, paid: false }
    ]);
    setNewParticipantName('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const splitExpense = {
        description,
        amount: Number(amount),
        participants,
      };

      const response = await fetch('http://localhost:5000/api/split-expense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(splitExpense),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Split expense created successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create split expense",
          variant: "destructive",
        });
      }

      // Reset form after successful submission
      setDescription('');
      setAmount('');
      setParticipants([]);
      setNewParticipantName('');
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while creating the expense",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto p-6">
      <div>
        <Label>Description</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Dinner, Movie, etc."
        />
      </div>

      <div>
        <Label>Total Amount</Label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
        />
      </div>

      <div>
        <Label>Participants</Label>
        <div className="flex gap-2">
          <Input
            value={newParticipantName}
            onChange={(e) => setNewParticipantName(e.target.value)}
            placeholder="Participant name"
          />
          <Button onClick={addParticipant}>Add Participant</Button>
        </div>
      </div>

      <div>
        <h3>Participants</h3>
        {participants.map((participant, index) => (
          <div key={index} className="flex justify-between">
            <span>{participant.name}</span>
            <span>${participant.share.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <Button type="submit">Create Split Expense</Button>
    </form>
  );
};

export default SplitExpenseForm;
