import React from 'react';
import { Check, X } from 'lucide-react';

export type PasswordChecks = {
  minLength: boolean;
  maxLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  notCommon: boolean;
  notRepeated: boolean;
};

interface PasswordRequirementsProps {
  checks: PasswordChecks;
  darkMode?: boolean;
  minLength?: number;
}

/**
 * Feedback visual en vivo de la contraseña mientras el usuario la escribe.
 * Muestra una barra de fuerza + lista de requisitos con ✓/✗.
 *
 * La "fuerza" se calcula en base a cuántas categorías de caracteres cumple
 * (0-4) más bonificaciones por longitud y penalizaciones por contraseñas comunes.
 */
export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({
  checks,
  darkMode = false,
  minLength = 10,
}) => {
  // Requisitos que se muestran al usuario (orden lógico de lectura)
  const items: { key: keyof PasswordChecks; label: string; critical: boolean }[] = [
    { key: 'minLength', label: `Mínimo ${minLength} caracteres`, critical: true },
    { key: 'notCommon', label: 'No es una contraseña común', critical: true },
    { key: 'notRepeated', label: 'No es un solo carácter repetido', critical: true },
    { key: 'hasUpper', label: 'Al menos una mayúscula (A-Z)', critical: false },
    { key: 'hasLower', label: 'Al menos una minúscula (a-z)', critical: false },
    { key: 'hasNumber', label: 'Al menos un número (0-9)', critical: false },
    { key: 'hasSymbol', label: 'Al menos un símbolo (!@#$%...)', critical: false },
  ];

  // Contar categorías (max 4): mayúscula, minúscula, número, símbolo
  const categories = [checks.hasUpper, checks.hasLower, checks.hasNumber, checks.hasSymbol]
    .filter(Boolean).length;

  // Requisitos "duros" que siempre deben cumplirse
  const hardRequirementsMet = checks.minLength && checks.maxLength && checks.notCommon && checks.notRepeated;

  // La contraseña es válida si cumple los requisitos duros Y tiene al menos 3 categorías
  const isValid = hardRequirementsMet && categories >= 3;

  // Calcular fuerza visual (0..1) para la barra
  let strength = 0;
  if (checks.minLength) strength += 0.2;
  if (checks.maxLength) strength += 0.05;
  if (checks.notCommon) strength += 0.15;
  if (checks.notRepeated) strength += 0.05;
  strength += (categories / 4) * 0.55; // 0.55 máximo por categorías
  strength = Math.min(strength, 1);

  // Si no cumple un requisito duro, la fuerza se capa (no puede pasar de "Media")
  if (!hardRequirementsMet) strength = Math.min(strength, 0.45);

  // Color según nivel
  const level =
    !hardRequirementsMet || categories < 2
      ? 'weak'
      : categories < 3
        ? 'medium'
        : categories === 3
          ? 'strong'
          : 'excellent';

  const barColorClass =
    level === 'weak'
      ? 'bg-rose-500'
      : level === 'medium'
        ? 'bg-amber-500'
        : level === 'strong'
          ? 'bg-blue-500'
          : 'bg-emerald-500';

  const labelColorClass =
    level === 'weak'
      ? 'text-rose-500'
      : level === 'medium'
        ? 'text-amber-500'
        : level === 'strong'
          ? 'text-blue-500'
          : 'text-emerald-500';

  const levelLabel =
    level === 'weak' ? 'Débil' : level === 'medium' ? 'Media' : level === 'strong' ? 'Fuerte' : 'Segura';

  return (
    <div className="space-y-2 mt-2">
      {/* Barra de fuerza */}
      <div className="flex items-center gap-2">
        <div
          className={`flex-1 h-1.5 rounded-full overflow-hidden ${
            darkMode ? 'bg-slate-800' : 'bg-slate-200'
          }`}
        >
          <div
            className={`h-full transition-all duration-300 ${barColorClass}`}
            style={{ width: `${strength * 100}%` }}
          />
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider ${labelColorClass}`}>
          {levelLabel}
        </span>
      </div>

      {/* Aviso de regla 3-de-4 */}
      <p
        className={`text-[10px] font-medium ${
          darkMode ? 'text-slate-500' : 'text-slate-400'
        }`}
      >
        Combina al menos <strong>3 de 4</strong>: mayúsculas, minúsculas, números, símbolos.
      </p>

      {/* Lista de requisitos */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 pt-1">
        {items.map((item) => {
          const ok = checks[item.key];
          return (
            <li
              key={item.key}
              className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                ok
                  ? darkMode
                    ? 'text-emerald-400'
                    : 'text-emerald-600'
                  : darkMode
                    ? 'text-slate-500'
                    : 'text-slate-400'
              }`}
            >
              {ok ? (
                <Check className="w-3 h-3 shrink-0" strokeWidth={3} />
              ) : (
                <X className="w-3 h-3 shrink-0" strokeWidth={3} />
              )}
              <span>{item.label}</span>
            </li>
          );
        })}
      </ul>

      {/* Mensaje final si está lista */}
      {isValid && (
        <div
          className={`flex items-center gap-2 text-[11px] font-bold pt-1 ${
            darkMode ? 'text-emerald-400' : 'text-emerald-600'
          }`}
        >
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
          <span>Contraseña válida y lista para usar</span>
        </div>
      )}
    </div>
  );
};