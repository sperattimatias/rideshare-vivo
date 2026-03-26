# rideshare-vivo

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-fiyddegr)


## Testing

El proyecto incluye una base mínima de tests automatizados con `node --test` (compilando TypeScript con `tsc`) para lógica de negocio crítica:

- aceptación/transiciones de viaje
- cálculo de tarifa y split de comisión
- validaciones críticas de pagos
- utilidades geoespaciales
- guards de rutas por rol

### Ejecutar tests

```bash
npm run test
```

Modo watch:

```bash
npm run test:watch
```
