
(function(){
    const storage_key = 'advanced_search';

    const persist_timeout_hours = 24;
    const persist_timeout_ms = 60 * 60 * 1000 * persist_timeout_hours;

    const search_engines = {
        'https://google.com/search?q=': '/images/google-logo-scaled.png',
        'https://scholar.google.com/scholar?q=': '/images/google-scholar-logo-scaled.png',
        'https://en.wikipedia.org/wiki/Special:Search?search=': '/images/wikipedia-logo-scaled.png',
        'https://youtube.com/results?q=': '/images/youtube-logo-scaled.png'
    }

    const default_engine = 'https://google.com/search?q=';

    const store = {
        tab_id: null,

        init: (tab_id) => {
            let existing_storage, storage;
            try {
                existing_storage = JSON.parse(localStorage[storage_key]);
            } catch (e) {
                existing_storage = {};
            }
            store.tab_id = tab_id;
            storage = store._removeExpiredData(existing_storage);
            localStorage[storage_key] = JSON.stringify(storage);
        },

        _removeExpiredData: (storage) => {
            //get rid of expired storage
            let filtered_storage = {};
            for (tab_id in storage) {
                if (storage[tab_id].timestamp && !store._isExpired(storage[tab_id].timestamp)) {
                    filtered_storage[tab_id] = storage[tab_id];
                }
            }
            return filtered_storage;
        },

        _isExpired: (timeout) => {
            return (timeout + persist_timeout_ms) < Date.now();
        },

        _parse: () => {
            try {
                storage = JSON.parse(localStorage[storage_key]);
            } catch (e) {
                storage = {};
            }
            if (!storage[store.tab_id]) {
                storage[store.tab_id] = {timestamp: Date.now()};
            }
            return storage;
        },

        _save: (key, value) => {
            let storage = store._parse();
            storage[store.tab_id][key] = value;
            storage[store.tab_id]['timestamp'] = Date.now();
            localStorage[storage_key] = JSON.stringify(storage);
        },

        get: (key, default_value, ignore_cache_timeout) => {
            const storage = store._parse()[store.tab_id];
            ignore_cache_timeout = ignore_cache_timeout === true ? true : false;
            const invalid = store._isExpired(storage['timeout']) && !ignore_cache_timeout;
            return (storage[key] === undefined || invalid) ? default_value : storage[key];
        },

        set: (key, value) => {
            store._save(key, value);
        }
    }

    const page = {
        render: () => {
            $(document.body).prepend(
                $('<div />')
                    .attr('id', 'as-clear-style')
                    .append(
                        $('<div />')
                            .attr('id', 'chrome-advanced-search-container')
                            .append($('<div />').attr('id', 'as-input-container'))
                            .append($('<div />').attr('id', 'as-control-container'))
                            .css('display', 'block')
                    )
            )
            input.populate();
            control.populate();
        },

        destroy: () => {
            $('#as-clear-style').remove();
        },

        toggleVisible: () => {
            if (!page.isVisible()) {
                page.render();
            } else {
                page.destroy();
            }
        },

        isVisible: () => {
            // return store.get('visible', default_visible);
            return $('#as-clear-style').length == 1;
        },

        getTabId: () => {
            return tab_id;
        }

    }

    const control = {
        populate: () => {
            let select_active = false;
            $('#as-control-container')
                .html('')
                .append(
                    $('<div />')
                        .attr('id', 'as-engine-select')
                        .append(
                            $('<div />')
                                .attr('id', 'as-selected-engine')
                                .append(
                                    $('<img />')
                                        .attr('src', chrome.extension.getURL(
                                            search_engines[
                                                store.get(
                                                    'selected-engine',
                                                    default_engine
                                                )
                                            ]
                                        ))
                                ),
                            $('<div />')
                                .attr('id', 'as-engine-toggle-drop')
                                .append(svg.toggleDropIcon()),
                            $('<div />')
                                .attr('id', 'as-engine-options')
                                .css(
                                    'visibility',
                                    select_active ? 'visible' : 'hidden'
                                )
                                .append(Object.keys(search_engines).map((engine) => {
                                    return $('<div />')
                                        .attr('id', 'as-engine-container')
                                        .append(
                                            $('<img />')
                                                .attr(
                                                    'src',
                                                    chrome.extension.getURL(
                                                        search_engines[engine]
                                                    ))
                                        )
                                        .on('click', () => {
                                            store.set('selected-engine', engine);
                                            control.populate();
                                            $('.as-term-input').last().focus();
                                        });
                                }))
                        )
                        .on('click', () => {
                            select_active = !select_active;
                            $('#as-engine-options').css(
                                'visibility',
                                select_active ? 'visible' : 'hidden'
                            )
                        }),
                    $('<div />')
                        .addClass('as-btn as-clear-btn')
                        .html('clear')
                        .on('click', () => {
                            store.set('input-content', input.getInitialFormValue());
                            input.populate();
                        }),
                    $('<div />')
                        .addClass('as-btn as-submit-btn')
                        .html('search')
                        .on('click', () => {
                            input.submitQuery();
                        }),
                    $('<div />')
                        .addClass('as-close-extension')
                        .append(svg.closeIcon())
                        .on('click', () => {page.toggleVisible()})
                )
        }
    }

    const term_template = {
        value: "",
        not: false,
        exact: true
    };

    const input = {
        populate: () => {
            $('#as-input-container').html('');

            input.getContent().map((and_block, and_block_key) => {
                let content = input.getContent();
                $('#as-input-container')
                    .append(
                        $('<div />')
                            .addClass('as-input-list')
                            .append(and_block.terms.map((term, term_key) => {
                                return $('<div />').addClass('as-single-term').append(
                                    $('<input / type="text">')
                                        .addClass('as-term-input')
                                        .attr('placeholder', 'search term')
                                        .val(content[and_block_key].terms[term_key].value)
                                        .on('keyup', (e) => {
                                            let content = input.getContent();
                                            content[and_block_key].terms[term_key].value = e.target.value;
                                            store.set('input-content', content);

                                            if (e.key == "Enter") {

                                                input.submitQuery();
                                            }
                                        }),
                                    $('<div>')
                                        .addClass('input-remove-icon')
                                        .append(svg.closeIcon())
                                        .on('click', function() {
                                            let content = input.getContent();
                                            if (content[and_block_key].terms.length === 1) {
                                                content.splice(and_block_key, 1)
                                            } else {
                                                content[and_block_key].terms.splice(term_key, 1);
                                            }
                                            store.set('input-content', content);
                                            input.populate();
                                        }),
                                    $('<div>')
                                        .addClass(() => {
                                            if (and_block.terms[term_key + 1]
                                                && and_block.terms[term_key + 1].not
                                            ) {
                                                return "as-and-not-badge";
                                            } else {
                                                return "as-and-badge";
                                            }
                                        })
                                        .html(() => {
                                            if (and_block.terms[term_key + 1]
                                                && and_block.terms[term_key + 1].not
                                            ) {
                                                return "<div>and</div><div>not</div>";
                                            } else {
                                                return "<div>and</div>";
                                            }
                                        })
                                        .css('display', () => {return term_key == (and_block.terms.length - 1) ? 'none' : 'inline-block'})
                                )
                            })

                        )
                        .append(
                            $('<div />').addClass('as-logic-buttons').append(
                                $('<div />')
                                    .addClass('as-btn as-and-btn')
                                    .html('add term')
                                    .on('click', () => {
                                        let content = input.getContent();
                                        content[and_block_key].terms.push(
                                            term_template
                                        )
                                        store.set('input-content', content);
                                        input.populate();
                                    }),
                                $('<div />')
                                    .addClass('as-btn as-not-btn')
                                    .html('exclude term')
                                    .on('click', () => {
                                        let content = input.getContent();
                                        let template = {...term_template};
                                        template.not = true;
                                        content[and_block_key].terms.push(
                                            template
                                        )
                                        store.set('input-content', content);
                                        input.populate();
                                    })
                            )

                        )
                    )

                $('.as-term-input').last().focus();
            })
        },

        getInitialFormValue: () => {
            return [{'terms': [{...term_template}]}];
        },

        parseQuery: () => {
            let content = input.getContent(true);

            query = content.map((and_block, and_block_key) => {
                return and_block['terms'].map((term) => {
                    if (term.value === '') {
                        return '';
                    } else {
                        return (term.not ? "-": "")
                            + '"'
                            + term.value.replace(/"/g, '\\"').replace(/\s/g, "+")
                            + '"';
                    }
                }).join('+')
            })

            return query;
        },

        submitQuery: () => {
            window.location = store.get(
                'selected-engine',
                default_engine,
                true
            ) + input.parseQuery();
        },

        getContent: (ignore_cache_timeout) => {
            return store.get('input-content', input.getInitialFormValue(), ignore_cache_timeout === true);
        }
    }

    const svg = {
        closeIcon: function() {
            return $(
                '<svg viewBox="0 0 24 24">'
                + '<path fill="#000000" '
                + 'd="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,'
                + '17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"'
                + ' /></svg>'
            );
        },
        toggleDropIcon: function() {
            return $(
                '<svg fill="#000000" height="24" viewBox="0 0 24 24" '
                + 'width="24" xmlns="http://www.w3.org/2000/svg">'
                + '<path d="M7 10l5 5 5-5z"/>'
                + '<path d="M0 0h24v24H0z" fill="none"/></svg>'
            );
        }
    }

    $(document).on('keydown', (e) => {
        if (e.shiftKey && e.ctrlKey && e.key.toLowerCase() == 'f') {
            page.toggleVisible();
        } else if (e.key == 'Escape' && page.isVisible()) {
            page.toggleVisible();
        }
    })

    // listen for extension icon clicks
    chrome.runtime.onMessage.addListener(
        (msg, sender, sendResponse) => {
           if (msg.action == 'toggle_search') {
                page.toggleVisible();
           }
        }
    );

    chrome.runtime.sendMessage({action: "fetch-tab"}, (response) => {
        let tab_id = response.tab_id;
        console.log('tab_id', response, tab_id);
        store.init(tab_id);
    });


})();