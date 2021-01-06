import Type from "../Type";
function objectHandler(propertyDispatcher, value) {
  for (const key in propertyDispatcher)
    propertyDispatcher[key](value[key]);
}
function arrayHandler(dispatchArray, dispatchElement, propertyDispatcher, value) {
  dispatchArray(value);
  for (let element of value)
    dispatchElement(element);
  for (const key in propertyDispatcher)
    propertyDispatcher[key](value[key]);
}
export default function createDispatcher(schema, handler) {
  if (typeof schema == "object") {
    if (Array.isArray(schema)) {
      const typeofArray = schema[0];
      const properties = schema[1] || {};
      const propertyDispatcher = {};
      for (let key in properties)
        propertyDispatcher[key] = createDispatcher(properties[key], handler);
      return arrayHandler.bind(null, handler[Type.Array], createDispatcher(typeofArray, handler), propertyDispatcher);
    } else {
      const propertyDispatcher = {};
      for (let key in schema)
        propertyDispatcher[key] = createDispatcher(schema[key], handler);
      return objectHandler.bind(null, propertyDispatcher);
    }
  }
  return handler[schema];
}
