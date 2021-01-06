export default new class {
    constructor() {
        this.zero = 0;
        this.one = 1;
        this.true = true;
        this.false = false;
        this.infinity = Infinity;
        this['-Infinity'] = -Infinity;
        this.int = 765768657;
        this.double = 5.97987;
        this.string = "Hey my friends";
        this.arrayOfIntegers = [5, 32, 78];
        // arrayOfArrayOfIntegers = [[1, 3, 5], [2, 4, 6]]
        // arrayOfDoubles = [8.4, 8, 934.3476]
        // arrayOfStrings = ["Hey", "You", "How are you?"]
        // arrayOfAny = [5, "Zabu", ["Coco"]]
        // static schema = {
        // 	zero: Atom.Integer,
        // 	one: Atom.Integer,
        // }
    }
};
