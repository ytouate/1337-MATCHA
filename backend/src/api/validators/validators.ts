import Joi from "joi";

export const signUpSchema = Joi.object({
    first_name: Joi.string().max(25).min(3).required(),
    last_name: Joi.string().max(25).min(3).required(),
    username: Joi.string().max(10).min(3).required(),
    password: Joi.string().max(100).min(5).required(),
    repeat_password: Joi.ref('password'),
    email: Joi.string().email().required(),
    gender: Joi.string().regex(/^(male|female)$/).required()
})

export const signinSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().max(100).min(5).required()
})

export const userInitializationSchema = Joi.object({
    interests: Joi
        .array().items(
            Joi.string().valid(
                'Travel',
                'Fitness',
                'Food',
                'Music',
                'Movies',
                'Art',
                'Adventure',
                'Sports',
                'Gaming',
                'Books',
                'Tech',
                'Fashion',
                'Pets',
                'Photography',
                'Nature',
                'Yoga',
                'Coffee',
                'Outdoors',
                'Hiking',
                'Work',
                'Startups'
            )
        )
        .required(),
    bio: Joi.string().max(500)
})


export const InterestsSchema = Joi.object({
    interests: Joi
        .array().items(
            Joi.string().valid(
                'Travel',
                'Fitness',
                'Food',
                'Music',
                'Movies',
                'Art',
                'Adventure',
                'Sports',
                'Gaming',
                'Books',
                'Tech',
                'Fashion',
                'Pets',
                'Photography',
                'Nature',
                'Yoga',
                'Coffee',
                'Outdoors',
                'Hiking',
                'Work',
                'Startups'
            )
        )
        .required(),
})

export const bioSchema = Joi.object({
    bio: Joi.string().max(500)
})

export const updateUserSchema = Joi.object({
    first_name: Joi.string().max(25).min(3).required(),
    last_name: Joi.string().max(25).min(3).required(),
    username: Joi.string().max(10).min(3).required(),
    email: Joi.string().email().required(),
    interests: Joi
        .array().items(
            Joi.string().valid(
                'Travel',
                'Fitness',
                'Food',
                'Music',
                'Movies',
                'Art',
                'Adventure',
                'Sports',
                'Gaming',
                'Books',
                'Tech',
                'Fashion',
                'Pets',
                'Photography',
                'Nature',
                'Yoga',
                'Coffee',
                'Outdoors',
                'Hiking',
                'Work',
                'Startups'
            )
        ).required(),
    bio: Joi.string().max(500).required()
})