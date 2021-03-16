import start from 'fartest'
import DataBuffer from '../bunker • 3/DataBuffer'

start(({ stage, same }) => {
   stage('Create DataBuffer')
   const buffer = DataBuffer.new(12)

   stage('Set value like an array')
   for (let i = 0; i < buffer.byteLength; i++) {
      buffer[i] = 255 - i
      buffer[i] == 255 - i
   }

   stage('Copy DataBuffer')
   const buffer2 = DataBuffer.new(buffer)

   for (let i = 0; i < buffer2.byteLength; i++) {
      buffer2[i] = i
      buffer2[i] == i
   }
})
