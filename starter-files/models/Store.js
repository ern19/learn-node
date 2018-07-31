const mongoose = require('mongoose')
mongoose.Promise = global.Promise
const slug = require('slugs')

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Store name is required'
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String]
})

storeSchema.pre('save', function(next) {
  if (!this.isModified('name')) {
    next()
    return
  }
  this.slug = slug(this.name)
  next()
  //TODO make slugs more resilient
})

module.exports = mongoose.model('Store', storeSchema)