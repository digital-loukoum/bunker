import start from 'fartest'
import DataBuffer from '../bunker • 3/DataBuffer'

start(({ stage, test, same }) => {
   stage('Create DataBuffer')
   const buffer = DataBuffer.new(12)

   stage('Set value like an array')
   for (let i = 0; i < buffer.byteLength; i++) {
      buffer[i] = 255 - i
      same(buffer[i], 255 - i)
   }

   stage('Copy DataBuffer')
   const buffer2 = DataBuffer.new(buffer)

   for (let i = 0; i < buffer2.byteLength; i++) {
      buffer2[i] = i
      same(buffer2[i], i)
   }

   stage('Slice is a DataBuffer')
   const begin = 1, end = 6
   const slice = buffer2.slice(begin, end)
   test(slice instanceof DataBuffer)

   stage('Slice has the right length')
   same(slice.byteLength, end - begin)

   stage('Slice has the right values')
   for (let i = begin; i < end; i++) {
      same(slice[i - begin], buffer2[i])
   }

   stage('Slice is a reference')
   for (let i = begin; i < end; i++) {
      slice[i - begin] = 0
      same(buffer2[i], 0)
   }
})
