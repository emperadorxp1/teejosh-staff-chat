import type Anthropic from '@anthropic-ai/sdk';

export const tools: Anthropic.Tool[] = [
  {
    name: 'search_products',
    description: 'Busca productos en la tienda por nombre, SKU o set/expansion. La busqueda funciona palabra por palabra (cada palabra debe estar en el nombre). IMPORTANTE: Expande abreviaciones antes de buscar (ETB -> Elite Trainer Box, BB -> Booster Box). Retorna id, nombre, precio, stock disponible.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Texto de busqueda con abreviaciones expandidas.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'check_stock',
    description: 'Verifica el stock disponible de un producto especifico por su ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        product_id: {
          type: 'string',
          description: 'UUID del producto',
        },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'get_daily_sales',
    description: 'Obtiene el resumen de ventas del dia actual. Incluye total de pedidos, monto total, desglose por metodo de pago y cantidad de items vendidos.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'list_daily_sales',
    description: 'Lista las ventas individuales del dia con detalle: numero de orden, hora, items, total y metodo de pago. Util cuando el staff quiere ver las ventas para elegir cual cancelar.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_my_earnings',
    description: 'Obtiene las ganancias/comisiones de un staff. Incluye: ventas totales, comision por ventas (S/4 por cada S/150), dias de caja abierta, bonus por caja (S/4 por dia), retiros de productos, y balance final.',
    input_schema: {
      type: 'object' as const,
      properties: {
        staff_user_id: {
          type: 'string',
          description: 'UUID del staff cuyas ganancias se quieren consultar',
        },
      },
      required: ['staff_user_id'],
    },
  },
  {
    name: 'list_staff',
    description: 'Lista todos los miembros del staff con su ID y nombre. Solo para uso de administradores.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
];

export type ToolName = 'search_products' | 'check_stock' | 'get_daily_sales' | 'list_daily_sales' | 'get_my_earnings' | 'list_staff';
