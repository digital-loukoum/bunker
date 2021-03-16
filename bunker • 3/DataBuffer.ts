type DataBufferInterface = {
   getInt32(offset: number): number
   getFloat32(offset: number): number
   getFloat64(offset: number): number

   setInt32(value: number, offset: number): void
   setFloat32(value: number, offset: number): void
   setFloat64(value: number, offset: number): void
};

export default typeof Buffer == 'undefined' ?
   /**
    * On a non-node environment we create a class DataBuffer that emulates the
    * node environment. Internally, this class use the DataView method instead
    * of node's Buffer methods.
    */
   class DataBuffer extends Uint8Array implements DataBufferInterface {
      public view!: DataView

      constructor(value: number | Uint8Array) {
         super(value as any)
         this.view = new DataView(this.buffer)
      }

      static new(value: number | Uint8Array) {
         return new DataBuffer(value)
      }

      slice(begin = 0, end = this.byteLength) {
         return new DataBuffer(this.subarray(begin, end))
      }

      getInt32(offset = 0) { return this.view.getInt32(offset, true) }
      getFloat32(offset = 0) { return this.view.getFloat32(offset, true) }
      getFloat64(offset = 0) { return this.view.getFloat64(offset, true) }

      setInt32(value: number, offset = 0) { this.view.setInt32(offset, value, true) }
      setFloat32(value: number, offset = 0) { this.view.setFloat32(offset, value, true) }
      setFloat64(value: number, offset = 0) { this.view.setFloat64(offset, value, true) }
   }

   :

   /**
    * On a node environment we extend the Buffer class which has very fast methods
    * for encoding / decoding strings and numbers.
    * That may change in the future if the speed of DataView catch up with Buffer.
    */
   class DataBuffer extends Buffer implements DataBufferInterface {
      static new(value: number | Uint8Array | Buffer | DataBuffer) {
         const buffer = typeof value == 'number' ?
            Buffer.allocUnsafe(value)
            :
            Buffer.from(value)
         // @ts-ignore [this way of extending Buffer cannot be understood by TS compiler]
         buffer.__proto__ = DataBuffer.prototype
         return buffer as unknown as DataBuffer
      }

      slice(begin = 0, end = this.byteLength): DataBuffer {
         const slice = super.slice(begin, end)
         // @ts-ignore [this way of extending Buffer cannot be understood by TS compiler]
         slice.__proto__ = DataBuffer.prototype
         return slice as DataBuffer
      }

      getInt32(offset = 0) { return this.readInt32LE(offset) }
      getFloat32(offset = 0) { return this.readFloatLE(offset) }
      getFloat64(offset = 0) { return this.readDoubleLE(offset) }

      setInt32(value: number, offset = 0) { this.writeInt32LE(value, offset) }
      setFloat32(value: number, offset = 0) { this.writeFloatLE(value, offset) }
      setFloat64(value: number, offset = 0) { this.writeDoubleLE(value, offset) }
   }
