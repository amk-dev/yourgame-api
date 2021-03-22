export async function findById(Model, id, lean = true) {
	if (lean) {
		return await Model.findById(id).exec()
	} else {
		return await Model.findById(id).lean().exec()
	}
}

export async function createNew(Model, doc) {
	let mongooseDoc = new Model(doc)
	await mongooseDoc.save()

	return mongooseDoc
}
