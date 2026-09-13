import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Filter, MoreHorizontal, UserCheck, Calendar, Briefcase, X } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface Candidate {
  id: string;
  name: string;
  position: string;
  experience: string;
  status: 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
}

const initialCandidates: Candidate[] = [
  { id: '1', name: 'Алексей Смирнов', position: 'Фронтенд разработчик', experience: '3 года', status: 'new' },
  { id: '2', name: 'Елена Попова', position: 'UX/UI Дизайнер', experience: '5 лет', status: 'screening' },
  { id: '3', name: 'Дмитрий Волков', position: 'Бэкенд разработчик', experience: '4 года', status: 'interview' },
  { id: '4', name: 'Ольга Новикова', position: 'Менеджер проектов', experience: '6 лет', status: 'offer' },
];

export default function Recruiting() {
  const { t } = useTranslation();
  const columns = [
    { id: 'new', title: t('recruiting.col.new') },
    { id: 'screening', title: t('recruiting.col.screening') },
    { id: 'interview', title: t('recruiting.col.interview') },
    { id: 'offer', title: t('recruiting.col.offer') },
  ];
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ position: '' });
  const [newCandidate, setNewCandidate] = useState({ name: '', position: '', experience: '' });

  const uniquePositions = Array.from(new Set(candidates.map(c => c.position)));
  
  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filters.position ? c.position === filters.position : true;
    return matchesSearch && matchesFilter;
  });

  const handleAddCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidate.name || !newCandidate.position) return;
    
    setCandidates(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      name: newCandidate.name,
      position: newCandidate.position,
      experience: newCandidate.experience || t('recruiting.noExperience'),
      status: 'new'
    }]);
    
    setNewCandidate({ name: '', position: '', experience: '' });
    setIsModalOpen(false);
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const candidate = candidates.find(c => c.id === draggableId);
    if (!candidate) return;

    const newCandidates = Array.from(candidates);
    
    // Update status
    const updatedCandidate = { ...candidate, status: destination.droppableId as Candidate['status'] };
    
    // Remove from old array
    const indexToRemove = newCandidates.findIndex(c => c.id === draggableId);
    newCandidates.splice(indexToRemove, 1);
    
    // Add to new position
    // Since we don't have a rigid global order but rather column-based arrays, we can just append or insert
    // For simplicity, we just push to the end or keep natural order, but let's try to maintain array order somewhat
    newCandidates.push(updatedCandidate);

    setCandidates(newCandidates);
  };

  return (
    <div className="space-y-6">
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-line">
              <h3 className="text-xl font-bold text-primary">{t('recruiting.addCandidate')}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCandidate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('recruiting.candidateName')} *</label>
                <input
                  type="text"
                  required
                  value={newCandidate.name}
                  onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                  className="w-full bg-app border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary"
                  placeholder={t('recruiting.ph.name')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('employees.col.position')} *</label>
                <input
                  type="text"
                  required
                  value={newCandidate.position}
                  onChange={(e) => setNewCandidate({ ...newCandidate, position: e.target.value })}
                  className="w-full bg-app border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary"
                  placeholder={t('recruiting.ph.position')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('recruiting.experience')}</label>
                <input
                  type="text"
                  value={newCandidate.experience}
                  onChange={(e) => setNewCandidate({ ...newCandidate, experience: e.target.value })}
                  className="w-full bg-app border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary"
                  placeholder={t('recruiting.ph.experience')}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-surface-3 hover:bg-surface-hover text-primary px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-accent-500 hover:bg-accent-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {t('common.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">{t('recruiting.title')}</h2>
          <p className="text-muted mt-1">{t('recruiting.subtitle')}</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          {t('recruiting.addCandidate')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-surface border border-line rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted">{t('recruiting.stats.openJobs')}</p>
              <p className="text-2xl font-bold text-primary">12</p>
            </div>
          </div>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted">{t('recruiting.stats.newApplicants')}</p>
              <p className="text-2xl font-bold text-primary">48</p>
            </div>
          </div>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted">{t('recruiting.stats.interviews')}</p>
              <p className="text-2xl font-bold text-primary">8</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input 
            type="text" 
            placeholder={t('recruiting.searchCandidates')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
        <div className="relative">
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)} 
            className={`bg-surface border ${isFilterOpen ? 'border-accent-500' : 'border-line'} hover:bg-surface-hover px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors`}
          >
            <Filter className="w-4 h-4" />
            {t('recruiting.filters')}
            {filters.position && (
              <span className="w-2 h-2 rounded-full bg-accent-500 absolute top-0 right-0 -mt-1 -mr-1"></span>
            )}
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-line rounded-xl shadow-xl z-10 p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-secondary mb-2">{t('employees.col.position')}</label>
                <select
                  value={filters.position}
                  onChange={(e) => setFilters({ ...filters, position: e.target.value })}
                  className="w-full bg-app border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary"
                >
                  <option value="">{t('recruiting.allPositions')}</option>
                  {uniquePositions.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={() => { setFilters({ position: '' }); setIsFilterOpen(false); }}
                  className="text-xs text-muted hover:text-primary transition-colors"
                >
                  {t('common.reset')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {columns.map(col => {
            const columnCandidates = filteredCandidates.filter(c => c.status === col.id);
            
            return (
              <div key={col.id} className="flex-1 min-w-[300px] bg-surface-2 border border-line rounded-2xl p-4 flex flex-col h-[600px]">
                <div className="flex justify-between items-center mb-4 px-2">
                  <h3 className="font-semibold text-primary">{col.title}</h3>
                  <span className="bg-surface-3 text-muted text-xs px-2 py-1 rounded-full">
                    {columnCandidates.length}
                  </span>
                </div>
                
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef} 
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto space-y-3 pr-2 transition-colors rounded-xl \${snapshot.isDraggingOver ? 'bg-surface-2' : ''}`}
                    >
                      {columnCandidates.map((candidate, index) => (
                        <Draggable key={candidate.id} draggableId={candidate.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-surface-3 border border-line rounded-xl p-4 cursor-grab hover:border-accent-500/50 transition-colors \${snapshot.isDragging ? 'shadow-xl shadow-black/50 ring-2 ring-accent-500 rotate-2' : ''}`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-primary">{candidate.name}</h4>
                                <button className="text-muted hover:text-secondary">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </div>
                              <p className="text-sm text-accent-400 mb-3">{candidate.position}</p>
                              <div className="flex items-center gap-2 text-xs text-muted">
                                <Briefcase className="w-3 h-3" />
                                {t('recruiting.experienceLabel')} {candidate.experience}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      
                      {columnCandidates.length === 0 && !snapshot.isDraggingOver && (
                        <div className="text-center p-6 border-2 border-dashed border-line rounded-xl text-muted text-sm">
                          {t('recruiting.dropHere')}
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
