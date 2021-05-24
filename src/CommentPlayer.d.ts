export class NicoCommentPlayer {
    constructor(params: {
        filter: {
            enableFilter: boolean,
            fork0: boolean,
            fork1: boolean,
            fork2: boolean,
        },
        showComment: boolean,
        debug: boolean,
        playbackRate: number,
    })

    appendTo(node: Node)
    setComment(data: string, options: {format: "json"})
    currentTime: number
}