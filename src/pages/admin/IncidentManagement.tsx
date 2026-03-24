import { useState, useEffect } from 'react';
import { AlertCircle, Plus, Search, Filter, Clock, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  createIncident,
  updateIncidentStatus,
  addIncidentAction,
  type IncidentType,
  type IncidentSeverity,
  type IncidentStatus,
} from '../../lib/adminOperations';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { Select } from '../../components/Select';
import { Textarea } from '../../components/Textarea';

interface Incident {
  id: string;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  trip_id?: string;
  driver_id?: string;
  passenger_id?: string;
  created_at: string;
  updated_at: string;
  assigned_to_admin_id?: string;
}

interface IncidentAction {
  id: string;
  action_type: string;
  notes?: string;
  created_at: string;
  admin: {
    user: {
      full_name: string;
    };
  };
}

interface IncidentManagementProps {
  onBack: () => void;
}

export default function IncidentManagement({ onBack }: IncidentManagementProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [incidentActions, setIncidentActions] = useState<IncidentAction[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadIncidents();
  }, [filterStatus, filterSeverity]);

  async function loadIncidents() {
    let query = supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    if (filterSeverity !== 'all') {
      query = query.eq('severity', filterSeverity);
    }

    const { data } = await query;
    setIncidents(data || []);
  }

  async function loadIncidentDetails(incidentId: string) {
    const { data } = await supabase
      .from('incident_actions')
      .select(`
        *,
        admin:admin_users(
          user:user_profiles(full_name)
        )
      `)
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false });

    setIncidentActions(data || []);
  }

  async function handleSelectIncident(incident: Incident) {
    setSelectedIncident(incident);
    await loadIncidentDetails(incident.id);
  }

  async function handleUpdateStatus(status: IncidentStatus, notes?: string) {
    if (!selectedIncident) return;

    setLoading(true);
    try {
      await updateIncidentStatus(selectedIncident.id, status, notes);
      await loadIncidents();
      if (selectedIncident) {
        await loadIncidentDetails(selectedIncident.id);
      }
      setSelectedIncident({ ...selectedIncident, status });
    } catch (error) {
      console.error('Error updating incident:', error);
      alert('Error updating incident');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddComment(comment: string) {
    if (!selectedIncident || !comment.trim()) return;

    setLoading(true);
    try {
      await addIncidentAction({
        incident_id: selectedIncident.id,
        action_type: 'COMMENT_ADDED',
        notes: comment,
      });
      await loadIncidentDetails(selectedIncident.id);
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setLoading(false);
    }
  }

  const getSeverityColor = (severity: IncidentSeverity) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-50';
      case 'HIGH': return 'text-orange-600 bg-orange-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'LOW': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: IncidentStatus) => {
    switch (status) {
      case 'OPEN': return <Clock className="w-4 h-4" />;
      case 'INVESTIGATING': return <AlertCircle className="w-4 h-4" />;
      case 'RESOLVED': return <CheckCircle className="w-4 h-4" />;
      case 'CLOSED': return <XCircle className="w-4 h-4" />;
    }
  };

  const filteredIncidents = incidents.filter(incident =>
    incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    incident.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Panel
        </Button>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Incidentes</h1>
            <p className="text-gray-600 mt-1">Monitorear y resolver incidentes de la plataforma</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Incidente
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Incidents List */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4">
              <div className="space-y-4">
                <Input
                  placeholder="Buscar incidentes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<Search className="w-5 h-5" />}
                />

                <div className="flex gap-2">
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    fullWidth
                  >
                    <option value="all">Todos los Estados</option>
                    <option value="OPEN">Abierto</option>
                    <option value="INVESTIGATING">Investigando</option>
                    <option value="RESOLVED">Resuelto</option>
                    <option value="CLOSED">Cerrado</option>
                  </Select>

                  <Select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    fullWidth
                  >
                    <option value="all">Todas las Severidades</option>
                    <option value="CRITICAL">Crítico</option>
                    <option value="HIGH">Alto</option>
                    <option value="MEDIUM">Medio</option>
                    <option value="LOW">Bajo</option>
                  </Select>
                </div>
              </div>
            </Card>

            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {filteredIncidents.map((incident) => (
                <Card
                  key={incident.id}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedIncident?.id === incident.id
                      ? 'border-2 border-blue-500 bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleSelectIncident(incident)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(incident.status)}
                      <span className="font-medium text-sm">{incident.incident_type}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(incident.severity)}`}>
                      {incident.severity}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{incident.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{incident.description}</p>
                  <div className="text-xs text-gray-500">
                    {new Date(incident.created_at).toLocaleString()}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Incident Details */}
          <div className="lg:col-span-2">
            {selectedIncident ? (
              <div className="space-y-4">
                <Card className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedIncident.title}
                      </h2>
                      <div className="flex gap-2 mb-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(selectedIncident.severity)}`}>
                          {selectedIncident.severity}
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                          {selectedIncident.status}
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                          {selectedIncident.incident_type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 mb-4">
                    <h3 className="font-semibold mb-2">Descripción</h3>
                    <p className="text-gray-700">{selectedIncident.description}</p>
                  </div>

                  {selectedIncident.trip_id && (
                    <div className="border-t pt-4 mb-4">
                      <h3 className="font-semibold mb-2">Viaje Relacionado</h3>
                      <p className="text-sm text-gray-600">ID de Viaje: {selectedIncident.trip_id}</p>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Acciones</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedIncident.status === 'OPEN' && (
                        <Button
                          variant="secondary"
                          onClick={() => handleUpdateStatus('INVESTIGATING')}
                          disabled={loading}
                        >
                          Iniciar Investigación
                        </Button>
                      )}
                      {selectedIncident.status === 'INVESTIGATING' && (
                        <>
                          <Button
                            onClick={() => {
                              const notes = prompt('Ingresá notas de resolución:');
                              if (notes) handleUpdateStatus('RESOLVED', notes);
                            }}
                            disabled={loading}
                          >
                            Marcar como Resuelto
                          </Button>
                        </>
                      )}
                      {selectedIncident.status === 'RESOLVED' && (
                        <Button
                          onClick={() => handleUpdateStatus('CLOSED')}
                          disabled={loading}
                        >
                          Cerrar Incidente
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Timeline */}
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Línea de Tiempo</h3>
                  <div className="space-y-4">
                    {incidentActions.map((action) => (
                      <div key={action.id} className="flex gap-4">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">{action.action_type}</p>
                              <p className="text-sm text-gray-600">{action.admin.user.full_name}</p>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(action.created_at).toLocaleString()}
                            </span>
                          </div>
                          {action.notes && (
                            <p className="text-sm text-gray-700 mt-1">{action.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const comment = new FormData(form).get('comment') as string;
                        handleAddComment(comment);
                        form.reset();
                      }}
                    >
                      <Textarea
                        name="comment"
                        placeholder="Agregar comentario..."
                        rows={3}
                        fullWidth
                      />
                      <Button type="submit" className="mt-2" disabled={loading}>
                        Agregar Comentario
                      </Button>
                    </form>
                  </div>
                </Card>
              </div>
            ) : (
              <Card className="p-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Seleccioná un incidente para ver los detalles</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
