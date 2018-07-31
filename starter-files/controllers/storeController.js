const mongoose = require('mongoose')
const Store = mongoose.model('Store')

exports.homePage = (req,res) => {
  res.render('index')
}

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store'})
}

exports.createStore = async (req,res) => {
  const store = new Store(req.body)
  await store.save()
  req.flash('success', `Successfully Created ${store.name}. Leave a Review?`)
  res.redirect(`/store/${store.slug}`)
}
exports.updateStore = async (req,res) => {
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true,
    runValidators: true
  }).exec()

  req.flash('success', `Successfully Edited <strong>${store.name}</strong>. <
  a href="/stores/${store.slug}">View Store =></a>`)
  res.redirect(`/stores/${store._id}/edit`)
}

exports.getStores = async(req,res) => {
  //query for all stores before displaying them
  const stores = await Store.find()
  res.render('stores', { title: 'Stores', stores})
}

exports.editStore = async(req,res) => {
  //Find the store
  //TODO: confirm they own it
  //render edit form so user can update
  const store = await Store.findOne({ _id: req.params.id })
  res.render('editStore', { title: `Edit ${store.name}`, store})
  console.log(store)
}
