export const STRINGS = {
  common: {
    loading: 'Cargando...',
    saving: 'Guardando...',
    processing: 'Procesando...',
    error: 'Error',
    success: 'Éxito',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    save: 'Guardar',
    edit: 'Editar',
    delete: 'Eliminar',
    back: 'Volver',
    backToPanel: 'Volver al Panel',
    search: 'Buscar',
    filter: 'Filtrar',
    noResults: 'No se encontraron resultados',
    required: 'Campo requerido',
    optional: 'Opcional',
  },

  auth: {
    login: 'Iniciar Sesión',
    signup: 'Registrarse',
    logout: 'Cerrar Sesión',
    email: 'Email',
    password: 'Contraseña',
    fullName: 'Nombre Completo',
    phone: 'Teléfono',
    forgotPassword: 'Olvidé mi contraseña',
    noAccount: '¿No tenés cuenta?',
    hasAccount: '¿Ya tenés cuenta?',
    invalidCredentials: 'Credenciales inválidas',
    emailRequired: 'El email es requerido',
    passwordRequired: 'La contraseña es requerida',
  },

  admin: {
    dashboard: 'Panel de Administración',
    operations: 'Centro de Operaciones',
    incidents: 'Gestión de Incidentes',
    driverVerification: 'Verificación de Conductores',
    auditLogs: 'Registros de Auditoría',
    intelligence: 'Centro de Inteligencia',
    demandRadar: 'Radar de Demanda',
    userManagement: 'Gestión de Usuarios',
    systemConfig: 'Configuración del Sistema',
    platformAnalytics: 'Analíticas de Plataforma',
    tripMonitoring: 'Monitoreo de Viajes',
  },

  driver: {
    dashboard: 'Panel de Conductor',
    profile: 'Perfil de Conductor',
    completeProfile: 'Completar Perfil',
    activeTrip: 'Viaje Activo',
    tripRequests: 'Solicitudes de Viaje',
    earnings: 'Ganancias',
    availability: 'Disponibilidad',
    online: 'En Línea',
    offline: 'Fuera de Línea',
    acceptTrip: 'Aceptar Viaje',
    rejectTrip: 'Rechazar Viaje',
    startTrip: 'Iniciar Viaje',
    completeTrip: 'Completar Viaje',
    mercadoPagoConnect: 'Conectar Mercado Pago',
  },

  passenger: {
    dashboard: 'Panel de Pasajero',
    requestRide: 'Solicitar Viaje',
    activeRide: 'Viaje Activo',
    rideHistory: 'Historial de Viajes',
    payTrip: 'Pagar Viaje',
    rateTrip: 'Calificar Viaje',
    findingDriver: 'Buscando conductor...',
    driverFound: 'Conductor encontrado',
    cancelRide: 'Cancelar Viaje',
  },

  trip: {
    status: {
      pending: 'Pendiente',
      accepted: 'Aceptado',
      inProgress: 'En Curso',
      completed: 'Completado',
      cancelled: 'Cancelado',
    },
    pickup: 'Punto de Recogida',
    dropoff: 'Punto de Destino',
    estimatedFare: 'Tarifa Estimada',
    distance: 'Distancia',
    duration: 'Duración',
  },

  incident: {
    severity: {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      critical: 'Crítica',
    },
    status: {
      open: 'Abierto',
      investigating: 'Investigando',
      resolved: 'Resuelto',
      closed: 'Cerrado',
    },
    type: {
      accident: 'Accidente',
      complaint: 'Queja',
      safety: 'Seguridad',
      payment: 'Pago',
      other: 'Otro',
    },
  },

  verification: {
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    active: 'Activo',
    inactive: 'Inactivo',
    suspended: 'Suspendido',
  },

  payment: {
    pending: 'Pendiente',
    processing: 'Procesando',
    completed: 'Completado',
    failed: 'Fallido',
    refunded: 'Reembolsado',
  },

  messages: {
    loadingData: 'Cargando datos...',
    loadingOperations: 'Cargando panel de operaciones...',
    loadingIntelligence: 'Cargando centro de inteligencia...',
    loadingDemandRadar: 'Cargando radar de demanda...',
    loadingConfiguration: 'Cargando configuración...',
    loadingProfile: 'Cargando perfil...',
    loadingTrips: 'Cargando viajes...',
    loadingIncidents: 'Cargando incidentes...',
    loadingUsers: 'Cargando usuarios...',

    savingChanges: 'Guardando cambios...',
    savingConfiguration: 'Guardando configuración...',

    errorLoading: 'Error al cargar datos',
    errorSaving: 'Error al guardar',
    errorProcessing: 'Error al procesar',

    successSaved: 'Guardado exitosamente',
    successUpdated: 'Actualizado exitosamente',
    successDeleted: 'Eliminado exitosamente',

    confirmDelete: '¿Estás seguro que deseas eliminar?',
    confirmCancel: '¿Estás seguro que deseas cancelar?',

    noDriversAvailable: 'No hay conductores disponibles',
    tripCancelled: 'Viaje cancelado',
    tripCompleted: 'Viaje completado',

    pleaseFillRequired: 'Por favor completá todos los campos requeridos',
    invalidData: 'Datos inválidos',
  },

  time: {
    now: 'Ahora',
    today: 'Hoy',
    yesterday: 'Ayer',
    thisWeek: 'Esta semana',
    thisMonth: 'Este mes',
    lastUpdate: 'Última actualización',
    createdAt: 'Creado el',
    updatedAt: 'Actualizado el',
  },

  stats: {
    total: 'Total',
    active: 'Activos',
    pending: 'Pendientes',
    completed: 'Completados',
    cancelled: 'Cancelados',
    average: 'Promedio',
    count: 'Cantidad',
  },
} as const;

export type StringKey = keyof typeof STRINGS;

export const getString = (category: StringKey, key: string): string => {
  const categoryStrings = STRINGS[category] as Record<string, any>;
  return categoryStrings?.[key] || key;
};
