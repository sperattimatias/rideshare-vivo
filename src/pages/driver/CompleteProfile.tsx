import { useState, FormEvent } from 'react';
import { ArrowLeft, Car, FileText, CreditCard, CheckCircle } from 'lucide-react';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { FileUpload } from '../../components/FileUpload';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MercadoPagoConnect } from './MercadoPagoConnect';

interface CompleteProfileProps {
  onBack: () => void;
  onComplete: () => void;
}

export function CompleteProfile({ onBack, onComplete }: CompleteProfileProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [phone, setPhone] = useState('');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehiclePhoto, setVehiclePhoto] = useState<File | null>(null);
  const [vehiclePhotoPreview, setVehiclePhotoPreview] = useState<string>('');

  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [licensePhoto, setLicensePhoto] = useState<File | null>(null);
  const [licensePhotoPreview, setLicensePhotoPreview] = useState<string>('');

  const [registrationPhoto, setRegistrationPhoto] = useState<File | null>(null);
  const [registrationPhotoPreview, setRegistrationPhotoPreview] = useState<string>('');

  const [insurancePhoto, setInsurancePhoto] = useState<File | null>(null);
  const [insurancePhotoPreview, setInsurancePhotoPreview] = useState<string>('');

  const steps = [
    { number: 1, title: 'Información Personal', icon: Car },
    { number: 2, title: 'Vehículo', icon: Car },
    { number: 3, title: 'Documentos', icon: FileText },
    { number: 4, title: 'Mercado Pago', icon: CreditCard },
  ];

  const handleStep1Submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ phone })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setCurrentStep(2);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleStep2Submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let vehiclePhotoUrl = '';

      if (vehiclePhoto) {
        const fileExt = vehiclePhoto.name.split('.').pop();
        const fileName = `${user?.id}/vehicle-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('driver-documents')
          .upload(fileName, vehiclePhoto);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('driver-documents')
          .getPublicUrl(fileName);

        vehiclePhotoUrl = publicUrl;
      }

      const { error: updateError } = await supabase
        .from('drivers')
        .update({
          vehicle_brand: vehicleBrand,
          vehicle_model: vehicleModel,
          vehicle_year: parseInt(vehicleYear),
          vehicle_color: vehicleColor,
          vehicle_plate: vehiclePlate.toUpperCase(),
          vehicle_photo_url: vehiclePhotoUrl || undefined,
        })
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      setCurrentStep(3);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let licensePhotoUrl = '';
      let registrationPhotoUrl = '';
      let insurancePhotoUrl = '';

      if (licensePhoto) {
        const fileExt = licensePhoto.name.split('.').pop();
        const fileName = `${user?.id}/license-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('driver-documents')
          .upload(fileName, licensePhoto);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('driver-documents')
          .getPublicUrl(fileName);
        licensePhotoUrl = publicUrl;
      }

      if (registrationPhoto) {
        const fileExt = registrationPhoto.name.split('.').pop();
        const fileName = `${user?.id}/registration-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('driver-documents')
          .upload(fileName, registrationPhoto);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('driver-documents')
          .getPublicUrl(fileName);
        registrationPhotoUrl = publicUrl;
      }

      if (insurancePhoto) {
        const fileExt = insurancePhoto.name.split('.').pop();
        const fileName = `${user?.id}/insurance-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('driver-documents')
          .upload(fileName, insurancePhoto);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('driver-documents')
          .getPublicUrl(fileName);
        insurancePhotoUrl = publicUrl;
      }

      const { error: updateError } = await supabase
        .from('drivers')
        .update({
          driver_license_number: licenseNumber,
          driver_license_expiry: licenseExpiry,
          driver_license_photo_url: licensePhotoUrl || undefined,
          vehicle_registration_photo_url: registrationPhotoUrl || undefined,
          insurance_photo_url: insurancePhotoUrl || undefined,
        })
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      setCurrentStep(4);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver al dashboard
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Completar Perfil de Conductor</h1>
          <p className="text-gray-600">Seguí los pasos para activar tu cuenta y empezar a recibir viajes</p>
        </div>

        <div className="flex justify-between mb-8">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <div key={step.number} className="flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                  </div>
                  <span
                    className={`text-xs text-center font-medium ${
                      isActive ? 'text-blue-600' : 'text-gray-500'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {step.number < steps.length && (
                  <div className="hidden sm:block h-1 bg-gray-200 mt-6 -mx-4" />
                )}
              </div>
            );
          })}
        </div>

        <Card>
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {currentStep === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Información Personal</h2>
                <Input
                  label="Teléfono"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+54 9 11 1234-5678"
                  required
                  fullWidth
                  helperText="Usaremos este número para contactarte sobre los viajes"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" variant="primary">
                  Siguiente
                </Button>
              </div>
            </form>
          )}

          {currentStep === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Información del Vehículo</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Marca"
                  type="text"
                  value={vehicleBrand}
                  onChange={(e) => setVehicleBrand(e.target.value)}
                  placeholder="Ej: Toyota, Ford, Chevrolet"
                  required
                  fullWidth
                />

                <Input
                  label="Modelo"
                  type="text"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="Ej: Corolla, Focus, Cruze"
                  required
                  fullWidth
                />

                <Input
                  label="Año"
                  type="number"
                  value={vehicleYear}
                  onChange={(e) => setVehicleYear(e.target.value)}
                  placeholder="2020"
                  required
                  fullWidth
                  min="2000"
                  max={new Date().getFullYear() + 1}
                />

                <Input
                  label="Color"
                  type="text"
                  value={vehicleColor}
                  onChange={(e) => setVehicleColor(e.target.value)}
                  placeholder="Ej: Blanco, Negro, Gris"
                  required
                  fullWidth
                />
              </div>

              <Input
                label="Patente"
                type="text"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                placeholder="AB123CD"
                required
                fullWidth
                helperText="Formato: AB123CD o ABC123"
              />

              <FileUpload
                label="Foto del Vehículo"
                accept="image/*"
                value={vehiclePhotoPreview}
                onChange={(file, preview) => {
                  setVehiclePhoto(file);
                  setVehiclePhotoPreview(preview || '');
                }}
                helperText="Foto clara del exterior del vehículo"
              />

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                  Anterior
                </Button>
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? 'Guardando...' : 'Siguiente'}
                </Button>
              </div>
            </form>
          )}

          {currentStep === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Documentos Requeridos</h2>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <Input
                  label="Número de Licencia"
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="12345678"
                  required
                  fullWidth
                />

                <Input
                  label="Fecha de Vencimiento"
                  type="date"
                  value={licenseExpiry}
                  onChange={(e) => setLicenseExpiry(e.target.value)}
                  required
                  fullWidth
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <FileUpload
                label="Foto de Licencia de Conducir"
                accept="image/*,application/pdf"
                value={licensePhotoPreview}
                onChange={(file, preview) => {
                  setLicensePhoto(file);
                  setLicensePhotoPreview(preview || '');
                }}
                required
                helperText="Foto clara de ambos lados de tu licencia"
              />

              <FileUpload
                label="Cédula Verde/Azul del Vehículo"
                accept="image/*,application/pdf"
                value={registrationPhotoPreview}
                onChange={(file, preview) => {
                  setRegistrationPhoto(file);
                  setRegistrationPhotoPreview(preview || '');
                }}
                required
                helperText="Documento que acredite la propiedad o permiso para conducir el vehículo"
              />

              <FileUpload
                label="Póliza de Seguro"
                accept="image/*,application/pdf"
                value={insurancePhotoPreview}
                onChange={(file, preview) => {
                  setInsurancePhoto(file);
                  setInsurancePhotoPreview(preview || '');
                }}
                required
                helperText="Seguro vigente del vehículo"
              />

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
                  Anterior
                </Button>
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? 'Guardando...' : 'Siguiente'}
                </Button>
              </div>
            </form>
          )}

          {currentStep === 4 && (
            <MercadoPagoConnect onComplete={onComplete} />
          )}
        </Card>
      </div>
    </div>
  );
}
