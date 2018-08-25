window.data = '';

class CSV {
    constructor(str, hasHeader) {
        this.data = str;
        this.hasHeader = hasHeader | true;
        this.currentIndex = 0;
    }

    toJSON() {
        const self = this;
        return new Promise((resolve, reject) => {
            if (self.data.length > 0) {
                if (self.hasHeader) {
                    self._getProps().then(function (props) {
                        const objects = [];
                        const length = props.length;
                        while (self.data[self.currentIndex] !== undefined) {
                            const data = self._readRow();
                            const obj = {};
                            for (let i = 0; i < length; i++)
                                obj[props[i]] = data[i];
                            objects.push(obj);
                        }
                        resolve(objects);
                    }).catch(function (err) {
                        reject(err);
                    });
                }
            } else {
                reject(Error('not header'));
            }
        });
    }

    _getProps() {
        const self = this;
        return new Promise((resolve, reject) => {
            try {
                const props = self._readRow();
                resolve (props);
            } catch (err) {
                reject(err);
            }
        });
    }

    _readRow() {
        if (this.data.length > 0) {
            let start = this.currentIndex;
            const values = [];
            let newLine = false;
            while (newLine === false) {
                let data = '';
                let index = start;
                if (this.data[start] === '"') {
                    while (this.data[index] !== '"' && this.data[index] !== undefined) {
                        data += this.data[index++];
                    }
                    values.push(data);
                    if (/\r|\n/.test(this.data[++index]) || this.data[index] === undefined) {
                        if (this.data[index] === '\r') index++;
                        newLine = true;
                        this.currentIndex = index + 1;
                    } else {
                        start = index + 1;
                    }
                } else {
                    while (!/(\r|\n)|,/.test(this.data[index]) && this.data[index] !== undefined) {
                        if (this.data[index] === '\r') index++;
                        data += this.data[index++];
                    }
                    values.push(data);
                    if (/\r|\n/.test(this.data[index]) || this.data[index] === undefined) {
                        if (this.data[index] === '\r') index++;
                        newLine = true;
                        this.currentIndex = index + 1;
                    } else {
                        start = index + 1;
                    }
                }
            }
            return values;
        }
    }
}

function test(str) {
    const csv = new CSV(str);
    csv.toJSON().then(data => {
        document.getElementById('json').appendChild(renderjson(data));
    }).catch(err => console.error(err));
    // console.log(csv.data[csv.currentIndex]);
    // console.log(csv.currentIndex);
}

document.getElementById('file').addEventListener('change', function (ev) {
    const file = ev.target.files[0];

    document.querySelector('.file-name').textContent = file.name;

    const reader = new FileReader();
    reader.onload = function () {
        window.data = reader.result;
    };

    reader.readAsText(file);
});