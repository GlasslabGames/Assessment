
module.exports = {
    // --------------------------------------------------------------------------------------
    apis: [
        {
            api: "/int/v1/aeng/queue",
            service: "aeng",
            controller: "queue",
            method: {
                post: "addToQueue"
            }
        },
        {
            api: "/int/v1/aeng/activity",
            service: "aeng",
            controller: "queue",
            method: {
                post: "addActivity"
            }
        }
    ]

};