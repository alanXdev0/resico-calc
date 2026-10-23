# RESICO Calc

Calculadora de facturación y retenciones para **RESICO Personas Físicas** (México, CFDI 4.0). Ayuda a freelancers y desarrolladores que facturan servicios a calcular subtotal, IVA, retenciones y total a recibir, en ambas direcciones, con centavos exactos. Es una PWA: se instala en desktop y móvil y funciona sin conexión.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 68 pruebas del motor (redondeo, inversa, propiedades, textos de IVA, guía)
npm run build      # typecheck + build de producción con service worker
```

---

## 1. Veredicto de arquitectura

| Criterio | App nativa (Swift / Compose) | Multiplataforma (Flutter / RN) | **Web App / PWA (Vite + React)** |
|---|---|---|---|
| **Fricción de adopción** | Alta: buscar en la tienda, instalar, permisos. El dev factura desde su laptop, con el portal del SAT abierto; una app de teléfono lo obliga a cambiar de dispositivo y teclear montos a mano. | Igual que la nativa en móvil. En desktop, Flutter web/desktop es posible, pero pesado y poco natural. | **Mínima:** una URL abierta en otra pestaña junto al portal del SAT. Copiar y pegar es nativo. Se instala con un clic si el usuario quiere. |
| **Time-to-market** | Dos bases de código, dos revisiones de tienda por release. | Una base de código, pero sigue con tiendas, firma y builds por plataforma. | Una base de código y un `git push` despliega. Sin revisiones de tienda. |
| **Costos** | Apple Developer USD 99/año + Google Play USD 25. | Lo mismo. | Hosting estático gratis (Cloudflare Pages, Netlify, Vercel o GitHub Pages). |
| **Mantenimiento** | Actualizar SDKs, versiones mínimas de SO y políticas de tienda. | Más actualizaciones del framework. | Dependencias web; el service worker se actualiza solo (`autoUpdate`). |
| **Offline / reutilización** | Excelente offline, sin reutilización entre plataformas. | Buena. | **Buena:** el service worker precachea todo (≈490 KB); el cálculo es 100 % local. La misma app corre en desktop, Android e iOS. |
| **Atajos / teclado** | No aplica. | Limitado. | Nativo del navegador: atajos de una tecla, Enter para copiar, `/` para enfocar. |

**Recomendación: PWA con Vite + React + TypeScript + Tailwind CSS.**

- El caso de uso es *desktop-first*: llenar el CFDI en el portal del SAT o en el PAC mientras se consulta la calculadora. Una pestaña con copiado de un clic le gana a cualquier app de teléfono.
- No hay servidor, cuentas ni datos que sincronizar: todo es aritmética local. Por eso se usa **Vite (SPA estática) y no Next.js**; SSR, rutas de API y un runtime de servidor solo agregarían complejidad sin beneficio. El resultado es un `dist/` estático que se aloja gratis.
- Si después se quiere presencia en tiendas, la misma PWA se puede empaquetar con **TWA (Google Play)** o **Capacitor (iOS)** sin reescribir nada.
- **Privacidad:** los montos de facturación nunca salen del navegador.

---

## 2. Reglas fiscales implementadas

### Presets de IVA (selector `1`–`5`)

| Preset | IVA trasladado | Retención IVA | Retención ISR por defecto | Fundamento |
|---|---|---|---|---|
| Persona Moral nacional | 16 % (`0.160000`) | 10.6667 % (`0.106667`, 2/3) | Sí, 1.25 % | Art. 1-A fr. II LIVA; art. 3 fr. I RLIVA; art. 113-J LISR |
| Persona Física nacional | 16 % | 0 % | No | Las PF no retienen a RESICO |
| Exportación de servicios | 0 % (`0.000000`) | 0 % | No | Art. 29 fr. IV LIVA |
| Zona fronteriza → PM | 8 % (`0.080000`) | 5.3333 % (`0.053333`, 2/3) | Sí, 1.25 % | Decreto de estímulos región fronteriza |
| Zona fronteriza → PF | 8 % | 0 % | No | |
| Personalizado | libre | libre (botón "2/3 del IVA") | se conserva | |

Al elegir un preset, el switch de retención de ISR se ajusta al tipo de receptor; después el usuario lo puede cambiar.

### ISR

- **Retención:** switch `R` y 1.25 % por defecto (art. 113-J LISR, solo cuando el receptor es persona moral).
- **Override:** chips con las tasas de la tabla RESICO (1.00, 1.10, 1.50, 2.00, 2.50 %) o cualquier decimal.
- **Panel de referencia:** tablas mensual (art. 113-E) y anual (art. 113-F). Resalta el rango del subtotal actual (la anual usa una proyección ×12) y estima el ISR mensual contra lo retenido.

---

## 3. Fórmulas y manejo de centavos

### Representación sin punto flotante

Todo el motor (`src/lib/`) trabaja con `bigint`:

- **Dinero:** centavos (`$10,408.33` → `1040833n`).
- **Tasas:** millonésimas, que es exactamente el `TasaOCuota` de 6 decimales del CFDI (`10.6667 %` → `106667n`).
- **Tipo de cambio:** millonésimas (el atributo `TipoCambio` admite 6 decimales).
- **Redondeo:** half-up a centavos, **por cada impuesto**, que es como valida el SAT.

Ejemplos reales donde los flotantes fallan (están en las pruebas):

| Operación | Correcto | `Math.round(a * b * 100) / 100` |
|---|---|---|
| $11.60 × 1.25 % = 0.145 | **$0.15** | $0.14 |
| $82.80 × 1.25 % = 1.035 | **$1.04** | $1.03 |

### Directo (Bruto → Neto)

```
IVA      = round(Subtotal × %IVA)
RetIVA   = round(Subtotal × %RetIVA)
RetISR   = round(Subtotal × %RetISR)
Total    = Subtotal + IVA − RetIVA − RetISR      ← sobre importes ya redondeados
```

### Inverso (Neto → Bruto), sin el error de centavo

La fórmula `Subtotal = Neto / Factor` (con `Factor = 1 + %IVA − %RetIVA − %RetISR`) **no es suficiente**, porque cada impuesto se redondea por separado. Medido sobre todos los netos entre $10,000.00 y $10,999.99:

| Receptor | `round(Neto/Factor)` falla por 1 ¢ | Netos imposibles de lograr exactos |
|---|---|---|
| Persona Moral | **20.3 %** | **15.0 %** |
| Persona Física | 0 % | 13.8 % |
| Frontera PM | 27.1 % | 7.9 % |

Además, el total **no siempre crece** con el subtotal: con PM, un subtotal de $6.79 da $7.08 y uno de $6.80 da $7.07. Por eso `computeReverse` busca en lugar de despejar:

1. Cada línea de impuesto agrega un error de redondeo de a lo más ±½ ¢, así que `|total(S) − S·Factor| ≤ E = ½ × (tasas ≠ 0)`.
2. Todo subtotal exacto está en `[(Neto − E)/Factor, (Neto + E)/Factor]`, una ventana de unos cuantos centavos que se evalúa completa.
3. Si hay subtotales exactos, se elige el más cercano a `Neto/Factor`. Si no hay ninguno, se elige el que deja **el menor excedente (nunca menos de lo pedido)** y la UI avisa: *"ningún subtotal da exactamente $10,000.02; recibes $0.01 más"*.

Una prueba de propiedades con 15,000 netos aleatorios (PRNG con semilla fija) verifica que el excedente siempre es 0 o 1 ¢ y que, cuando se reporta inexacto, de verdad no existe un subtotal exacto cerca.

---

## 4. Experiencia de usuario

- **Tarjeta tipo CFDI:** subtotal, (+) IVA, (−) Ret. ISR, (−) Ret. IVA y total. Cada línea dice su porcentaje en claro, si se suma o se resta y sobre qué se calcula. La retención de 2/3 siempre indica su porcentaje: "2/3 = 10.6667 %" (16 % × 2/3), o "2/3 = 5.3333 %" en frontera. Los `TasaOCuota` están en el apartado plegable "Datos para el CFDI".
- **Cómo se reparte el IVA:** barra con lo que retiene el cliente y lo que llega a tu cuenta, en pesos y en porcentaje (p. ej. $1,066.67 · 2/3 = 10.6667 % y $533.33 · 1/3 = 5.3333 %), con el aviso de que ese IVA se paga al SAT. La sección de IVA muestra además el ejemplo "por cada $100 de subtotal".
- **Copiado de un clic:** cada importe se copia **sin `$` ni comas** (`1066.67`), listo para el portal del SAT. El resumen se copia en Markdown o en texto plano alineado.
- **Divisa (USD/EUR):** monto × FIX → MXN, con enlace a la página del FIX de Banxico y el total equivalente en la divisa.
- **Dark mode por defecto**, tema claro con `L`. La configuración se recuerda en `localStorage`.
- **Móvil:** barra fija con el resultado principal, que se oculta cuando la tarjeta está a la vista. Las pistas de teclado se ocultan en pantallas táctiles.
- **Guía fiscal** (botón en el encabezado o tecla `G`): modal que explica qué es RESICO, cada concepto de la factura paso a paso, quién retiene qué, qué modo usar, los pagos mensuales de ISR e IVA, un glosario y errores comunes. Usa los números de la factura capturada, o un ejemplo de $10,000 si aún no hay monto.
- **PWA:** botón "Instalar", indicador "Offline listo" y actualización automática.

| Tecla | Acción |
|---|---|
| `/` | Enfocar el monto |
| `Enter` (en el monto) | Copiar el resultado principal (total o subtotal según el modo) |
| `Esc` | Salir del campo / cerrar |
| `M` | Bruto ↔ Neto |
| `1`–`5` | Preset de IVA |
| `R` | Retención ISR on/off |
| `D` | Moneda extranjera on/off |
| `S` / `T` | Copiar subtotal / total |
| `C` / `Shift+C` | Copiar resumen Markdown / texto |
| `G` | Guía fiscal |
| `L` | Tema claro/oscuro |
| `?` | Ayuda |

---

## 5. Estructura

```
src/
  lib/                    ← motor puro, sin React (portable a Node, workers, etc.)
    decimal.ts            parseo, redondeo y formato con bigint
    engine.ts             computeForward / computeReverse / conversión de divisa
    presets.ts            presets de IVA, chips de ISR, tablas RESICO
    calculator.ts         entradas de la UI (strings) → resultado validado + errores/avisos
    summary.ts            resumen copiable (Markdown y texto)
    *.test.ts             pruebas con Vitest
  components/             UI (secciones, tarjeta CFDI, panel RESICO, atajos, toasts)
  hooks/                  estado persistente, atajos de teclado, PWA
public/                   íconos PWA (generados desde icon.svg con `npm run generate-pwa-assets`)
```

## 6. Despliegue

`npm run build` genera `dist/`, un sitio estático. Cualquier hosting estático sirve: Cloudflare Pages, Netlify, Vercel o GitHub Pages (en este último, ajusta `base` en `vite.config.ts` si no se sirve desde la raíz). El service worker requiere HTTPS, que todos estos dan por defecto.

## 7. Supuestos y límites

- Modela un CFDI de **un solo concepto**. Con varios conceptos, los PAC redondean por concepto y el total puede variar 1 ¢.
- Retención 2/3 con `TasaOCuota 0.106667`. Algunos sistemas usan `0.106666`; con el preset "Personalizado" se puede capturar.
- La tasa del 8 % fronterizo requiere estar inscrito en el padrón del estímulo y prestar el servicio en la región. Verifica que el decreto siga vigente.
- La estimación de ISR mensual es de referencia: la tasa RESICO aplica sobre el total de ingresos **cobrados** del periodo, no por factura.
- El tipo de cambio se captura a mano (la API SIE de Banxico requiere token).
- No sustituye la asesoría de un contador.
