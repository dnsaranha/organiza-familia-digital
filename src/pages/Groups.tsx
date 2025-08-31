import React from 'react';
import { FamilyGroups } from '@/components/FamilyGroups';

const Groups = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Grupos Familiares</h1>
      <FamilyGroups />
    </div>
  );
};

export default Groups;
