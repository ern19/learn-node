const mongoose = require('mongoose')
const Store = mongoose.model('Store')
const multer = require('multer')
const jimp = require('jimp')
const uuid = require('uuid')
const User = mongoose.model('User')

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/')
    if(isPhoto) {
      next(null,true)
    } else {
      next({message: "That isn't allowed"})
    }
  }
}

exports.homePage = (req,res) => {
  res.render('index')
}

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store'})
}

exports.upload = multer(multerOptions).single('photo')

exports.resize = async (req,res,next) => {
  if(!req.file) {
    next()
    return
  }
  const extension = req.file.mimetype.split('/')[1]
  req.body.photo = `${uuid.v4()}.${extension}`
  const photo = await jimp.read(req.file.buffer)
  await photo.resize(800, jimp.AUTO)
  await photo.write(`./public/uploads/${req.body.photo}`)
  next()
}

exports.createStore = async (req,res) => {
  req.body.author = req.user._id
  const store = new Store(req.body)
  await store.save()
  req.flash('success', `Successfully Created ${store.name}. Leave a Review?`)
  res.redirect(`/store/${store.slug}`)
}
exports.updateStore = async (req,res) => {
  req.body.location.type = 'Point'
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true,
    runValidators: true
  }).exec()

  req.flash('success', `Successfully Edited <strong>${store.name}</strong>
  <a href="/store/${store.slug}">View Store =></a>`)
  res.redirect(`/stores/${store._id}/edit`)
}

exports.getStores = async(req,res) => {
  const page = req.params.page || 1
  const limit = 4
  const skip = (page * limit) - limit
  //query for all stores before displaying them
  const storesPromise = Store
    .find()
    .skip(skip)
    .limit(limit)
    .sort({ created: 'desc' })
  const countPromise = Store.count()

  const [stores,count] = await Promise.all([storesPromise,countPromise]
    )
  
  const pages = Math.ceil(count / limit)
  if(!stores.length && skip) {
    req.flash('info', `Hey! You asked for a page that didn't exist! Here's page ${pages} instead.`)
    res.redirect(`/stores/page/${pages}`)
  }
  res.render('stores', { title: 'Stores', stores, page, pages, count})
}

exports.getStore = async(req,res,next) => {
  const store = await Store.findOne({slug: req.params.slug}).
    populate('author reviews')
  if(!store) return next()
  res.render('store', {title: store.name, store})
}

const confirmOwner = (store,user) => {
  if(!store.author.equals(user._id)) {
    throw Error('You must own a store to edit it.')
  }
}

exports.editStore = async(req,res) => {
  //Find the store
  //render edit form so user can update
  const store = await Store.findOne({ _id: req.params.id })
  confirmOwner(store, req.user)
  res.render('editStore', { title: `Edit ${store.name}`, store })
  console.log(store)
}

exports.getStoresByTag = async (req,res) => {
  const tag = req.params.tag
  const tagQuery = tag || { $exists: true }
  const tagsPromise = Store.getTagsList()
  const storesPromise = Store.find({ tags: tagQuery })

  const [tags, stores] = await Promise.all([tagsPromise, storesPromise])
  
  res.render('tags', {tags, title: 'Tags', tag, stores})
}

exports.getStoresByHearts = async (req,res) => {
  const stores = await Store.find({
    _id: { $in: req.user.hearts }
  })
  
  res.render('stores', { title: 'Your Favorite Stores', stores})
}

exports.searchStores = async (req,res) => {
  const stores = await Store.find({
    $text: {
      $search: req.query.q
    }
  }, {
    score: { $meta: 'textScore' }
  })
  .sort({ 
    score: { $meta: 'textScore' }
  })
  .limit(5)
  res.json(stores)
}

exports.mapStores = async (req,res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat)
  const query = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: 10000
      }
    }
  }

  const stores = await Store.find(query).select('slug name description location photo').limit(10)
  res.json(stores)
}

exports.mapPage = (req,res) => {
  res.render('map', {title: 'Map'})
}

exports.heartStore = async (req,res) => {
  const hearts = req.user.hearts.map(obj => obj.toString())
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet'
  const user = await User
  .findByIdAndUpdate(req.user._id,
    { [operator]: { hearts: req.params.id }},
    { new: true }
  )
  // User.findOneAndUpdate
  res.json(user)
}

exports.getTopStores = async = async (req,res) => {
  const stores = await Store.getTopStores()
  res.render('topStores', { stores, title: '★ Top Stores!' })

}