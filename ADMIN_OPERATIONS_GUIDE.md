# VIVO Platform - Admin Operations Guide

## Overview

The VIVO platform now features a **Professional Operations Center** for comprehensive administrative management. This guide covers all operational capabilities added in Phase 3.

---

## System Architecture

### Database Schema

#### New Tables

1. **incidents** - Platform incident management
   - Incident types: ACCIDENT, COMPLAINT, DISPUTE, FRAUD, SAFETY, HARASSMENT, LOST_ITEM, OTHER
   - Severity levels: LOW, MEDIUM, HIGH, CRITICAL
   - Status workflow: OPEN → INVESTIGATING → RESOLVED → CLOSED
   - Links to trips, drivers, and passengers

2. **incident_actions** - Timeline of incident handling
   - Action types: CREATED, ASSIGNED, STATUS_CHANGED, COMMENT_ADDED, DRIVER_SUSPENDED, etc.
   - Complete audit trail for each incident

3. **audit_logs** - Complete admin action audit trail
   - Tracks all admin actions across the platform
   - Records: action, entity type, old/new values, metadata
   - Immutable log for compliance

4. **driver_verification_history** - Driver approval workflow
   - Actions: APPROVED, REJECTED, SUSPENDED, REACTIVATED, etc.
   - Tracks document verification process
   - Links to admin who performed action

#### Enhanced Tables

- **drivers**: Added `cancelled_by_admin_id` and `admin_notes` fields
- **admin_users**: Added `is_active` and `last_login` fields

#### Database Views

1. **active_trips_operational** - Real-time active trips with full details
2. **open_incidents_summary** - Current incidents requiring attention
3. **drivers_status_summary** - Driver status breakdown

---

## Admin Modules

### 1. Operations Center (Dashboard)

**Route**: Admin Dashboard → Operations Center

**Features**:
- Real-time metrics (updates every 10 seconds)
- Active trips monitoring
- Online drivers count
- Open incidents tracking
- Driver status breakdown

**Key Metrics**:
- Active trips count
- Online drivers (with percentage on trip)
- Open incidents (with critical count)
- Total drivers (with online percentage)

**Usage**:
- Monitor platform health at a glance
- Identify issues requiring immediate attention
- Track operational efficiency

---

### 2. Incident Management

**Route**: Admin Dashboard → Incident Management

**Features**:
- Create and track incidents
- Assign incidents to admins
- Update incident status
- Add comments and notes
- View complete timeline
- Link to related trips/drivers/passengers

**Severity Levels**:
- **CRITICAL**: Immediate action required (safety issues, accidents)
- **HIGH**: Priority handling (serious complaints, disputes)
- **MEDIUM**: Standard processing (general complaints)
- **LOW**: Minor issues (suggestions, feedback)

**Workflow**:
1. Incident created (OPEN)
2. Admin investigates (INVESTIGATING)
3. Issue resolved (RESOLVED)
4. Case closed (CLOSED)

**Actions Available**:
- Start investigation
- Mark as resolved
- Close incident
- Add comments
- Suspend driver
- Cancel trip
- Create refund

**Usage**:
```typescript
// Create incident
await createIncident({
  incident_type: 'SAFETY',
  severity: 'HIGH',
  title: 'Driver speeding complaint',
  description: 'Passenger reported unsafe driving',
  trip_id: 'trip-uuid',
  driver_id: 'driver-uuid',
  passenger_id: 'passenger-uuid'
});

// Update status
await updateIncidentStatus(incidentId, 'RESOLVED', 'Issue resolved with driver warning');

// Add action
await addIncidentAction({
  incident_id: incidentId,
  action_type: 'DRIVER_CONTACTED',
  notes: 'Driver counseled on safe driving practices'
});
```

---

### 3. Enhanced Driver Verification

**Route**: Admin Dashboard → Driver Verification

**Features**:
- Complete driver profile view
- Document verification (license, registration, insurance)
- Vehicle information validation
- Mercado Pago status check
- Verification history
- Approve/reject/suspend actions

**Verification Process**:
1. Driver submits application
2. Admin reviews documents
3. Admin validates information
4. Admin approves or rejects
5. Action logged in verification history

**Required Documents**:
- Driver's license (with expiry date)
- Vehicle registration
- Insurance policy
- Vehicle photo

**Actions Available**:
- **Approve**: Activate driver for trips (requires all documents)
- **Reject**: Deny application with reason
- **Suspend**: Temporarily disable driver
- **Reactivate**: Restore suspended driver

**Usage**:
```typescript
// Approve driver
await approveDriver(driverId, 'All documents verified, vehicle inspected');

// Reject driver
await rejectDriver(driverId, 'Expired driver license');

// Suspend driver
await suspendDriver(driverId, 'Multiple safety complaints', incidentId);

// Reactivate driver
await reactivateDriver(driverId, 'Completed safety training');
```

**Auto-computed Field**:
- `can_receive_trips`: Automatically set based on:
  - Status = ACTIVE
  - MP Status = LINKED
  - Documents validated = true
  - Score >= 60

---

### 4. Enhanced Trip Monitoring

**Route**: Admin Dashboard → Trip Monitoring

**Features**:
- Real-time trip list (auto-refresh every 5 seconds)
- Detailed trip view with timeline
- GPS tracking history
- Payment details
- Rating information
- Admin intervention actions

**Trip Details Include**:
- Passenger and driver information
- Origin and destination
- Distance and duration
- Fare breakdown
- Trip timeline (requested, accepted, started, completed)
- GPS tracking points
- Payment status
- Rating details

**Admin Actions**:
- Cancel trip (with reason)
- Create incident
- View GPS history
- Review payment details
- Check ratings

**Usage**:
```typescript
// Cancel trip
await cancelTripByAdmin(tripId, 'Safety concern - driver suspended', incidentId);

// Get trip details
const details = await getTripDetails(tripId);

// Get GPS history
const gpsData = await getTripGPSHistory(tripId);
```

---

### 5. Audit Logs

**Route**: Admin Dashboard → Audit Logs

**Features**:
- Complete audit trail of all admin actions
- Search and filter capabilities
- View old/new values
- Export functionality
- Entity-based filtering

**Logged Actions**:
- Driver approvals/rejections/suspensions
- Trip cancellations
- Incident creations/updates
- Configuration changes
- User modifications

**Log Details**:
- Who performed the action
- When it was performed
- What entity was affected
- Previous values
- New values
- Additional metadata

**Compliance**:
- Logs are immutable
- All sensitive actions tracked
- Searchable for audits
- Export for reporting

**Usage**:
- Compliance audits
- Investigating admin actions
- Tracking system changes
- Security monitoring

---

## Admin Operations API

### Core Functions

All functions are in `src/lib/adminOperations.ts`

#### Incident Management

```typescript
// Create incident
createIncident(params: CreateIncidentParams): Promise<Incident>

// Update status
updateIncidentStatus(incidentId: string, status: IncidentStatus, notes?: string): Promise<Incident>

// Assign incident
assignIncident(incidentId: string, adminId: string): Promise<Incident>

// Add action
addIncidentAction(params: IncidentActionParams): Promise<void>
```

#### Driver Management

```typescript
// Approve driver
approveDriver(driverId: string, notes?: string): Promise<Driver>

// Reject driver
rejectDriver(driverId: string, reason: string): Promise<Driver>

// Suspend driver
suspendDriver(driverId: string, reason: string, incidentId?: string): Promise<Driver>

// Reactivate driver
reactivateDriver(driverId: string, notes?: string): Promise<Driver>
```

#### Trip Management

```typescript
// Cancel trip
cancelTripByAdmin(tripId: string, reason: string, incidentId?: string): Promise<Trip>

// Get trip details
getTripDetails(tripId: string): Promise<TripWithDetails>

// Get GPS history
getTripGPSHistory(tripId: string): Promise<GPSLocation[]>
```

#### Dashboard Queries

```typescript
// Get operational dashboard data
getOperationalDashboard(): Promise<DashboardStats>

// Get recent audit logs
getRecentAuditLogs(limit?: number): Promise<AuditLog[]>
```

#### Audit Logging

```typescript
// Create audit log (automatic for admin operations)
createAuditLog(params: AuditLogParams): Promise<void>
```

---

## Security & Permissions

### Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:

#### Incidents
- Admins can view all incidents
- Admins can create incidents
- Admins can update incidents

#### Audit Logs
- **SUPER_ADMIN only** can view audit logs
- All admins can create logs (system-generated)

#### Driver Verification History
- All admins can view
- All admins can create records

### Admin Roles

1. **SUPER_ADMIN**
   - Full platform access
   - View audit logs
   - Manage other admins
   - All operational capabilities

2. **OPERATIONS**
   - Trip monitoring
   - Incident management
   - Driver oversight

3. **SUPPORT**
   - User assistance
   - Basic incident handling
   - View-only access to sensitive data

4. **VALIDATOR**
   - Driver verification only
   - Document review
   - Approve/reject drivers

---

## Best Practices

### Incident Management

1. **Severity Assignment**
   - CRITICAL: Safety issues, accidents, fraud
   - HIGH: Serious complaints, disputes, harassment
   - MEDIUM: Standard complaints, lost items
   - LOW: General feedback, suggestions

2. **Resolution Notes**
   - Always document resolution actions
   - Include next steps if applicable
   - Reference related entities (drivers, trips)

3. **Escalation**
   - Use ESCALATED action for complex cases
   - Assign to appropriate admin role
   - Set severity to HIGH or CRITICAL

### Driver Verification

1. **Document Validation**
   - Verify all documents are clear and legible
   - Check expiry dates
   - Confirm vehicle matches registration
   - Validate insurance coverage

2. **Rejection Reasons**
   - Always provide clear rejection reason
   - Specify what needs correction
   - Be professional and constructive

3. **Suspension**
   - Link to incident when possible
   - Provide clear reason
   - Document resolution requirements

### Trip Interventions

1. **Cancellations**
   - Only cancel when necessary
   - Provide clear reason
   - Consider creating incident for tracking

2. **GPS Monitoring**
   - Review for route deviations
   - Check for unusual patterns
   - Use for dispute resolution

### Audit Compliance

1. **Log Review**
   - Regular audit log reviews
   - Monitor unusual patterns
   - Track admin performance

2. **Export**
   - Export logs for compliance
   - Archive important records
   - Maintain data retention policies

---

## Operational Workflows

### Handling Safety Incident

1. Receive safety complaint
2. Create CRITICAL incident
3. Immediately suspend driver
4. Cancel active trip if applicable
5. Contact passenger for details
6. Investigate incident
7. Take corrective action
8. Document resolution
9. Reactivate or permanently suspend driver

### Driver Onboarding

1. Driver submits application
2. Admin reviews documents
3. Admin validates Mercado Pago link
4. Admin checks background
5. Admin approves or requests corrections
6. Verification logged
7. Driver activated
8. Welcome notification sent

### Dispute Resolution

1. Create DISPUTE incident
2. Assign to appropriate admin
3. Gather evidence (GPS, payment, rating)
4. Contact both parties
5. Review trip details
6. Make determination
7. Document resolution
8. Issue refund if applicable
9. Close incident

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Active Trips**: Should match expected demand
2. **Online Drivers**: Ensure sufficient supply
3. **Critical Incidents**: Require immediate attention
4. **Pending Verifications**: Process within 24 hours

### Alert Thresholds

- Critical incidents > 0: Immediate action
- High severity incidents > 5: Review workload
- Pending verifications > 10: Allocate resources
- Online drivers < 5: Supply shortage

---

## Technical Notes

### Database Triggers

- Driver status changes logged automatically
- Audit logs created for all admin operations
- Verification history updated on status changes

### Real-time Updates

- Operations dashboard: 10 second refresh
- Trip monitoring: 5 second refresh
- Incident list: Manual refresh or on action

### Performance Considerations

- Indexes on frequently queried fields
- Views for complex queries
- Limit on audit log retrieval (default 100)

---

## Future Enhancements

### Planned Features

1. **Automated Alerts**
   - Email notifications for critical incidents
   - SMS alerts for urgent actions
   - Dashboard notifications

2. **Advanced Analytics**
   - Incident trends
   - Admin performance metrics
   - Driver quality scores

3. **Workflow Automation**
   - Auto-assign incidents based on type
   - Scheduled driver verification reviews
   - Automatic suspension for score thresholds

4. **Enhanced Reporting**
   - Custom report builder
   - Scheduled report delivery
   - Export to multiple formats

---

## Support

For technical issues or questions about admin operations:
1. Check this guide first
2. Review audit logs for action history
3. Consult database schema documentation
4. Contact platform administrator

---

## Changelog

### Phase 3 - Professional Operations (Current)

**Database**:
- Added incidents, incident_actions, audit_logs, driver_verification_history tables
- Created operational views for dashboard
- Enhanced RLS policies
- Added audit triggers

**Features**:
- Operations Center dashboard
- Professional incident management
- Enhanced driver verification
- Advanced trip monitoring
- Complete audit logging

**UI Components**:
- OperationalDashboard
- IncidentManagement
- DriverVerificationEnhanced
- AuditLogs
- Enhanced TripMonitoring

**API Functions**:
- Full admin operations library
- Audit logging system
- Dashboard data aggregation

---

*Last Updated: 2026-03-24*
