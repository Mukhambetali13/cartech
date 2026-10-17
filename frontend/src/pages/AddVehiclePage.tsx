import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { vehiclesApi } from '../api';

export default function AddVehiclePage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vin: '',
    plate_number: '',
    color: '',
    engine_type: '',
    transmission: '',
    current_mileage: '',
    notes: '',
  });

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const vehicle = await vehiclesApi.create({
        make: form.make,
        model: form.model,
        year: Number(form.year),
        vin: form.vin || undefined,
        plate_number: form.plate_number || undefined,
        color: form.color || undefined,
        engine_type: form.engine_type || undefined,
        transmission: form.transmission || undefined,
        current_mileage: form.current_mileage ? Number(form.current_mileage) : undefined,
        notes: form.notes || undefined,
      });
      navigate(`/vehicles/${vehicle.id}/service-book`);
    } catch {
      setError('Не удалось добавить автомобиль');
    } finally {
      setSaving(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 600 }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 'var(--spacing-lg)' }}
          onClick={() => navigate(-1)}
        >
          ← Назад
        </button>
        <h1 style={{ marginBottom: 'var(--spacing-xl)' }}>Добавить автомобиль</h1>

        {error && (
          <div className="alert alert-warning" style={{ marginBottom: 'var(--spacing-lg)' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card">
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="v-make">Марка *</label>
              <input
                id="v-make"
                className="form-input"
                placeholder="Toyota, BMW, Lada..."
                value={form.make}
                onChange={(e) => handleChange('make', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="v-model">Модель *</label>
              <input
                id="v-model"
                className="form-input"
                placeholder="Camry, X5, Vesta..."
                value={form.model}
                onChange={(e) => handleChange('model', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="v-year">Год выпуска *</label>
              <input
                id="v-year"
                type="number"
                className="form-input"
                min={1990}
                max={currentYear + 1}
                value={form.year}
                onChange={(e) => handleChange('year', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="v-mileage">Текущий пробег (км)</label>
              <input
                id="v-mileage"
                type="number"
                className="form-input"
                placeholder="75000"
                min={0}
                value={form.current_mileage}
                onChange={(e) => handleChange('current_mileage', e.target.value)}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="v-plate">Госномер</label>
              <input
                id="v-plate"
                className="form-input"
                placeholder="А 000 АА 77"
                value={form.plate_number}
                onChange={(e) => handleChange('plate_number', e.target.value.toUpperCase())}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="v-vin">VIN номер</label>
              <input
                id="v-vin"
                className="form-input"
                placeholder="17 символов"
                maxLength={17}
                value={form.vin}
                onChange={(e) => handleChange('vin', e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="v-engine">Тип двигателя</label>
              <select
                id="v-engine"
                className="form-input"
                value={form.engine_type}
                onChange={(e) => handleChange('engine_type', e.target.value)}
              >
                <option value="">Выберите...</option>
                <option value="petrol">⛽ Бензин</option>
                <option value="diesel">🛢️ Дизель</option>
                <option value="electric">⚡ Электро</option>
                <option value="hybrid">♻️ Гибрид</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="v-trans">КПП</label>
              <select
                id="v-trans"
                className="form-input"
                value={form.transmission}
                onChange={(e) => handleChange('transmission', e.target.value)}
              >
                <option value="">Выберите...</option>
                <option value="auto">Автомат (АКПП)</option>
                <option value="manual">Механика (МКПП)</option>
                <option value="cvt">Вариатор (CVT)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="v-color">Цвет</label>
            <input
              id="v-color"
              className="form-input"
              placeholder="Чёрный, Белый, Серебристый..."
              value={form.color}
              onChange={(e) => handleChange('color', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="v-notes">Заметки</label>
            <textarea
              id="v-notes"
              className="form-input"
              rows={3}
              placeholder="Особенности автомобиля, известные проблемы..."
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 'var(--spacing-md)' }}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Сохранение...
              </>
            ) : (
              '🚗 Добавить автомобиль'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
