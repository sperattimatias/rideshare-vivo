import { useState, useEffect, FormEvent } from 'react';
import { ArrowLeft, Star, Send, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type TripRow = Database['public']['Tables']['trips']['Row'];
type DriverRow = Database['public']['Tables']['drivers']['Row'];
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];

interface TripWithDetails extends TripRow {
  driver?: DriverRow & { user_profile?: UserProfileRow };
}

interface RateTripProps {
  tripId: string;
  onBack: () => void;
  onComplete: () => void;
}

export function RateTrip({ tripId, onBack, onComplete }: RateTripProps) {
  const [trip, setTrip] = useState<TripWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  const positiveCategories = [
    'Muy amable',
    'Conducción segura',
    'Auto limpio',
    'Conversación agradable',
    'Llegó rápido',
    'Siguió la ruta óptima',
  ];

  const negativeCategories = [
    'Conducción brusca',
    'Auto sucio',
    'Música muy alta',
    'Llegó tarde',
    'Ruta innecesariamente larga',
    'Actitud descortés',
  ];

  useEffect(() => {
    fetchTripDetails();
  }, [tripId]);

  const fetchTripDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          driver:drivers(
            *,
            user_profile:user_profiles(*)
          )
        `)
        .eq('id', tripId)
        .maybeSingle();

      if (error) throw error;
      setTrip(data as TripWithDetails);

      const { data: existingRating } = await supabase
        .from('ratings')
        .select('rating, comment, categories')
        .eq('trip_id', tripId)
        .maybeSingle();

      if (existingRating) {
        setRating(existingRating.rating);
        setComment(existingRating.comment || '');
        setCategories(existingRating.categories || []);
      }
    } catch (error) {
      console.error('Error fetching trip details:', error);
      setError('Error al cargar los detalles del viaje');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    setCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Por favor seleccioná una calificación');
      return;
    }

    if (!trip?.driver_id) {
      setError('Error: no se pudo encontrar el conductor');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { error: ratingError } = await supabase.from('ratings').insert([
        {
          trip_id: tripId,
          driver_id: trip.driver_id,
          passenger_id: trip.passenger_id,
          rating,
          comment: comment || null,
          categories: categories.length > 0 ? categories : null,
        },
      ]);

      if (ratingError) throw ratingError;

      const { data: ratings, error: fetchError } = await supabase
        .from('ratings')
        .select('rating')
        .eq('driver_id', trip.driver_id);

      if (fetchError) throw fetchError;

      const totalRatings = ratings.length;
      const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;

      await supabase
        .from('drivers')
        .update({
          total_ratings: totalRatings,
          average_rating: averageRating,
        })
        .eq('id', trip.driver_id);

      const { data: driver } = await supabase
        .from('drivers')
        .select('score')
        .eq('id', trip.driver_id)
        .maybeSingle();

      if (driver) {
        const ratingBonus = (rating - 3) * 2;
        const newScore = Math.max(0, Math.min(100, driver.score + ratingBonus));

        await supabase
          .from('drivers')
          .update({ score: newScore })
          .eq('id', trip.driver_id);
      }

      onComplete();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!trip || !trip.driver) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Volver
            </button>
          </div>
        </nav>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="text-center py-12">
            <p className="text-gray-600">No se pudo cargar la información del viaje</p>
          </Card>
        </div>
      </div>
    );
  }

  const driver = trip.driver;
  const driverProfile = driver.user_profile;
  const alreadyRated = categories.length > 0 || rating > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {alreadyRated ? 'Tu calificación' : 'Calificar viaje'}
          </h1>
          <p className="text-gray-600">
            {alreadyRated
              ? 'Ya calificaste este viaje'
              : '¿Cómo fue tu experiencia con este viaje?'}
          </p>
        </div>

        <Card className="mb-6">
          {driverProfile && (
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                {driverProfile.profile_photo_url ? (
                  <img
                    src={driverProfile.profile_photo_url}
                    alt={driverProfile.full_name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-gray-500">
                    {driverProfile.full_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-gray-900">{driverProfile.full_name}</p>
                <p className="text-sm text-gray-600">
                  {driver.vehicle_brand} {driver.vehicle_model} - {driver.vehicle_plate?.toUpperCase()}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-sm text-gray-700">
                    {driver.average_rating.toFixed(1)} ({driver.total_ratings} viajes)
                  </span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Calificación {!alreadyRated && <span className="text-red-500">*</span>}
              </label>
              <div className="flex justify-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    disabled={alreadyRated}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => !alreadyRated && setHoveredRating(star)}
                    onMouseLeave={() => !alreadyRated && setHoveredRating(0)}
                    className={`transition-all ${
                      alreadyRated ? 'cursor-default' : 'cursor-pointer hover:scale-110'
                    }`}
                  >
                    <Star
                      className={`w-12 h-12 transition-colors ${
                        star <= (hoveredRating || rating)
                          ? 'text-yellow-500 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-gray-600">
                {rating === 0 && 'Seleccioná una calificación'}
                {rating === 1 && 'Muy malo'}
                {rating === 2 && 'Malo'}
                {rating === 3 && 'Regular'}
                {rating === 4 && 'Bueno'}
                {rating === 5 && 'Excelente'}
              </p>
            </div>

            {rating > 0 && !alreadyRated && (
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  {rating >= 4 ? (
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="w-5 h-5 text-green-600" />
                      <span>¿Qué te gustó?</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ThumbsDown className="w-5 h-5 text-red-600" />
                      <span>¿Qué podría mejorar?</span>
                    </div>
                  )}
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(rating >= 4 ? positiveCategories : negativeCategories).map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        categories.includes(category)
                          ? rating >= 4
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {alreadyRated && categories.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  <div className="flex items-center gap-2">
                    {rating >= 4 ? (
                      <ThumbsUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <ThumbsDown className="w-5 h-5 text-red-600" />
                    )}
                    <span>Categorías seleccionadas</span>
                  </div>
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {categories.map((category) => (
                    <span
                      key={category}
                      className={`px-4 py-2 rounded-full text-sm font-medium ${
                        rating >= 4
                          ? 'bg-green-600 text-white'
                          : 'bg-red-600 text-white'
                      }`}
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                Comentario adicional (opcional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={alreadyRated}
                placeholder="Compartí más detalles sobre tu experiencia..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {comment.length}/500 caracteres
              </p>
            </div>

            {!alreadyRated && (
              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={onBack} fullWidth>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting || rating === 0}
                  fullWidth
                >
                  {submitting ? (
                    'Enviando...'
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar calificación
                    </>
                  )}
                </Button>
              </div>
            )}

            {alreadyRated && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 text-center">
                  Ya enviaste tu calificación para este viaje
                </p>
              </div>
            )}
          </form>
        </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Tu opinión es importante</h4>
          <p className="text-sm text-blue-800">
            Las calificaciones ayudan a mantener la calidad del servicio y a que otros pasajeros
            tomen mejores decisiones. Sé honesto y constructivo en tu evaluación.
          </p>
        </div>
      </div>
    </div>
  );
}
