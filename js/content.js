
(function(){
    const storage_key = 'advanced_search_extension';

    const persist_timeout_hours = 24;
    const persist_timeout_ms = 60 * 60 * 1000 * persist_timeout_hours;

    const search_engines = {
        google: {
            url: 'https://google.com/search?q=',
            logo: '/images/google-logo-scaled.png'
        },
        scholar: {
            url: 'https://scholar.google.com/scholar?q=',
            logo: '/images/google-scholar-logo-scaled.png'
        },
        wikipedia: {
            url: 'https://en.wikipedia.org/wiki/Special:Search?search=',
            logo: '/images/wikipedia-logo-scaled.png'
        },
        youtube: {
            url: 'https://youtube.com/results?q=',
            logo: '/images/youtube-logo-scaled.png'
        }
    };

    const default_engine = 'google';

    const util = {
        isset: (variable) => {
            if (variable === undefined || variable == null) {
                return false;
            } else {
                return true;
            }
        }
    }

    const store = {
        tab_id: null,

        cache: {},

        init: () => {
            store.cache = store._parseURL();
        },

        _parseURL: () => {
            let query = location.search.substr(1),
                result = {};
            query.split("&").forEach(function(part) {
                var item = part.split("=");
                if (item[0] == storage_key && util.isset(item[1])) {
                    try {
                        result = JSON.parse(decodeURIComponent(item[1]));
                    } catch (e) {}
                }
            });

            if (util.isset(result['input_content'])
            ) {
                for (let term in result['input_content']) {
                    result['input_content'][term]['value']
                        = result['input_content'][term]['value'].replace(/\+/g, ' ');
                }
            }

            return result;
        },

        get: (key, default_value) => {
            return (store.cache[key] === undefined) ? default_value : store.cache[key];
        },

        set: (key, value) => {
            store.cache[key] = value;
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
                                                    'selected_engine',
                                                    default_engine
                                                )
                                            ].logo
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
                                                        search_engines[engine].logo
                                                    ))
                                        )
                                        .on('click', () => {
                                            store.set('selected_engine', engine);
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
                            store.set('input_content', input.getInitialFormValue());
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
            $('#as-input-container')
                .html('')
                .append(
                    $('<div />')
                        .addClass('as-input-list')
                        .append(input.getContent().map((term, term_key) => {
                            let content = input.getContent();
                            return $('<div />').addClass('as-single-term').append(
                                $('<input / type="text" spellcheck="false">')
                                    .addClass('as-term-input')
                                    .attr('placeholder', 'search term')
                                    .val(content[term_key].value)
                                    .on('keyup', (e) => {
                                        let content = input.getContent();
                                        content[term_key].value = e.target.value;
                                        store.set('input_content', content);

                                        if (e.key == "Enter") {

                                            input.submitQuery();
                                        }
                                    }),
                                $('<div>')
                                    .addClass('input-remove-icon')
                                    .append(svg.closeIcon())
                                    .on('click', function() {
                                        let content = input.getContent();
                                        content.splice(term_key, 1);
                                        store.set('input_content', content);
                                        input.populate();
                                    }),
                                $('<div>')
                                    .addClass(() => {
                                        if (content[term_key + 1]
                                            && content[term_key + 1].not
                                        ) {
                                            return "as-and-not-badge";
                                        } else {
                                            return "as-and-badge";
                                        }
                                    })
                                    .html(() => {
                                        if (content[term_key + 1]
                                            && content[term_key + 1].not
                                        ) {
                                            return "<div>and</div><div>not</div>";
                                        } else {
                                            return "<div>and</div>";
                                        }
                                    })
                                    .css('display', () => {
                                        return term_key == (content.length - 1)
                                            ? 'none'
                                            : 'inline-block';
                                    })
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
                                    content.push({...term_template});
                                    store.set('input_content', content);
                                    input.populate();
                                }),
                            $('<div />')
                                .addClass('as-btn as-not-btn')
                                .html('exclude term')
                                .on('click', () => {
                                    let content = input.getContent();
                                    let template = {...term_template};
                                    template.not = true;
                                    content.push(template);
                                    store.set('input_content', content);
                                    input.populate();
                                })
                        )

                    )
                );

            $('.as-term-input').last().focus();
        },

        getInitialFormValue: () => {
            return [{...term_template}];
        },

        createQuery: () => {
            let content = input.getContent();

            query = content.map((term) => {
                if (term.value === '') {
                    return '';
                } else {
                    return (term.not ? "-": "")
                        + '"'
                        + encodeURIComponent(term.value)
                        + '"';
                }
            }).join(' ')

            return query;
        },

        createCacheParam: () => {
            return '&' + storage_key + '=' + encodeURIComponent(
                JSON.stringify(store.cache)
            );
        },

        submitQuery: () => {
            window.location = search_engines[store.get(
                'selected_engine',
                default_engine
            )].url + input.createQuery()
            + input.createCacheParam();
        },

        getContent: () => {
            return store.get('input_content', input.getInitialFormValue());
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

    //initialize query parsing and storage
    store.init();

})();