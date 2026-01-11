import mongoose, { Document, Model, Schema } from 'mongoose'

export interface IField {
    fieldName: string
    dataType: string
    description?: string
    optionsResourceType?: string
    required?: boolean
}

export interface IValue {
    fieldName: string
    value: any
    resource?: mongoose.Types.ObjectId
}

export interface IRelationship {
    type: string
    refType: 'ResourceTag'
    refId: mongoose.Types.ObjectId
}

export interface IResourceTag extends Document {
    type: 'resource' | 'config' | 'connections'
    name: string
    fields: IField[]
    values: IValue[]
    relationships: IRelationship[]
    resourceParent?: mongoose.Types.ObjectId
    isDeleted: boolean
    createdAt: Date
    updatedAt: Date
}

const FieldSchema = new Schema<IField>(
    {
        fieldName: { type: String, required: true },
        dataType: { type: String, required: true },
        description: { type: String },
        optionsResourceType: { type: String },
        required: { type: Boolean, default: false },
    },
    { _id: false }
)

const ValueSchema = new Schema<IValue>(
    {
        fieldName: { type: String, required: true },
        value: Schema.Types.Mixed,
        resource: {
            type: Schema.Types.ObjectId,
            ref: 'ResourceTag',
            required: false,
        },
    },
    { _id: false }
)

const RelationshipSchema = new Schema<IRelationship>(
    {
        type: { type: String, required: false },
        refType: {
            type: String,
            required: true,
            enum: ['ResourceTag'],
        },
        refId: {
            type: Schema.Types.ObjectId,
            refPath: 'relationships.refType',
            required: true,
        },
    },
    { _id: false }
)

const resourceTagSchema = new Schema<IResourceTag>(
    {
        type: {
            type: String,
            required: false,
            enum: ['resource', 'config', 'connections'],
            default: 'resource',
        },
        name: { type: String, required: true },
        fields: [FieldSchema],
        values: [ValueSchema],
        relationships: [RelationshipSchema],
        resourceParent: {
            type: Schema.Types.ObjectId,
            ref: 'ResourceTag',
            required: false,
        },
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
)

export const ResourceTag: Model<IResourceTag> =
    mongoose.models.ResourceTag ||
    mongoose.model<IResourceTag>('ResourceTag', resourceTagSchema)
