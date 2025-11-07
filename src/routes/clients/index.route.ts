


import { userRoutes } from "./users.route";
import { profileRoute} from "./profiles.route"
import { friendsRoutes } from "./friends.route";

import { Express  } from "express";
import { chatsRoutes } from "./chat.route";
import { postsRoutes } from "./posts.route";


export const routesClientApi = (app : Express) => {
    app.use("/users" , userRoutes) ;
    app.use("/profiles" , profileRoute)
    app.use("/friends" , friendsRoutes)
    app.use("/chats" , chatsRoutes)
    app.use("/posts", postsRoutes)
}