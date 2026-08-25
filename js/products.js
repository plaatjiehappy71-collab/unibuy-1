import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";


function formatPrice(amount) {
    return "R " + Number(amount).toLocaleString("en-ZA");
}


/* ---------- Get products from Firestore ---------- */

async function fetchFirestoreProducts() {

    try {

        const snapshot =
            await getDocs(
                collection(db, "products")
            );

        return snapshot.docs.map(function (docSnap) {

            const p = docSnap.data();

            const placeholder =
                "https://placehold.co/400x300/e8f0e8/006400?text=" +
                encodeURIComponent(
                    p.name || "Item"
                );

            return {

                id: docSnap.id,

                name:
                    p.name ||
                    "Untitled item",

                price:
                    p.price || 0,

                location:
                    p.location ||
                    "Campus",

                seller:
                    p.seller ||
                    "Student",

                sellerUid:
                    p.sellerUid ||
                    "",

                sellerEmail:
                    p.sellerEmail ||
                    "",

                category:
                    p.category ||
                    "other",

                description:
                    p.description ||
                    "",

                image:
                    p.image ||
                    placeholder,

                images:
                    p.image
                        ? [p.image]
                        : [placeholder],

                premium: false,

                /* ---------- Engagement ---------- */

                likes:
                    Number(p.likes || 0),

                views:
                    Number(p.views || 0),

                shares:
                    Number(p.shares || 0),

                contacts:
                    Number(
                        p.contacts ||
                        p.contactCount ||
                        p.whatsappClicks ||
                        0
                    ),

                /* ---------- Date ---------- */

                createdAt:
                    p.createdAt ||
                    p.timestamp ||
                    p.date ||
                    null
            };

        });

    } catch (error) {

        console.error(
            "Could not load products:",
            error
        );

        return [];
    }
}


/* ---------- Product cache ---------- */

let allProducts = [];
let loaded = false;


async function getAllProducts() {

    if (loaded) {
        return allProducts;
    }

    allProducts =
        await fetchFirestoreProducts();

    loaded = true;

    return allProducts;
}


/* =========================================
   HOT / TRENDING ALGORITHM
========================================= */


/* ---------- Calculate product age ---------- */

function getProductAgeHours(product) {

    if (!product.createdAt) {

        /*
         * Older products without a timestamp
         * receive no special freshness boost.
         */
        return 48;
    }

    let date = null;

    try {

        /*
         * Firebase Timestamp
         */
        if (
            product.createdAt &&
            typeof product.createdAt.toDate ===
                "function"
        ) {

            date =
                product.createdAt.toDate();

        }

        /*
         * JavaScript Date
         */
        else if (
            product.createdAt instanceof Date
        ) {

            date =
                product.createdAt;

        }

        /*
         * String / number timestamp
         */
        else {

            date =
                new Date(
                    product.createdAt
                );
        }

    } catch (error) {

        return 48;
    }


    if (
        !date ||
        Number.isNaN(
            date.getTime()
        )
    ) {

        return 48;
    }


    const ageHours =
        (
            Date.now() -
            date.getTime()
        ) /
        (1000 * 60 * 60);


    return Math.max(
        0,
        ageHours
    );
}


/* ---------- Calculate Hot Score ---------- */

function calculateHotScore(product) {

    const likes =
        Number(
            product.likes || 0
        );

    const views =
        Number(
            product.views || 0
        );

    const shares =
        Number(
            product.shares || 0
        );

    const contacts =
        Number(
            product.contacts || 0
        );


    /*
     * Engagement is more valuable than
     * simple views.
     */
    const engagementScore =
        (likes * 5) +
        (shares * 8) +
        (contacts * 10) +
        (views * 0.5);


    /*
     * Freshness:
     *
     * 0 hours  = strongest boost
     * 24 hours = moderate boost
     * 48 hours = no boost
     */
    const ageHours =
        getProductAgeHours(
            product
        );


    const freshness =
        Math.max(
            0,
            1 - (
                ageHours / 48
            )
        );


    const freshnessBonus =
        freshness * 20;


    return (
        engagementScore +
        freshnessBonus
    );
}


/* ---------- Get Top 5 ---------- */

function getHotProducts(products) {

    return products

        .map(function(product) {

            return {

                product:
                    product,

                score:
                    calculateHotScore(
                        product
                    )

            };

        })

        .sort(function(a, b) {

            return (
                b.score -
                a.score
            );

        })

        .slice(0, 5)

        .map(function(item) {

            return item.product;

        });
}


/* =========================================
   RENDER HOT RIGHT NOW
========================================= */

function renderHotProducts(products) {

    const container =
        document.getElementById(
            "hotProducts"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (!products.length) {

        container.innerHTML =
            '<div class="hot-empty">' +
                "Hot products will appear here once listings start getting activity." +
            "</div>";

        return;
    }


    const hotProducts =
        getHotProducts(
            products
        );


    hotProducts.forEach(
        function(product, index) {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "hot-card";


            const placeholder =
                "https://placehold.co/400x300/e8f0e8/006400?text=" +
                encodeURIComponent(
                    product.name ||
                    "Item"
                );


            card.innerHTML =

                '<span class="hot-rank">' +
                    "#" +
                    (index + 1) +
                "</span>" +

                '<img src="' +
                    product.image +
                    '" alt="' +
                    product.name +
                    '" ' +

                    'onerror="this.onerror=null;this.src=\'' +
                    placeholder +
                    '\'">' +

                '<div class="hot-card-body">' +

                    '<div class="hot-name">' +
                        product.name +
                    "</div>" +

                    '<div class="hot-price">' +
                        formatPrice(
                            product.price
                        ) +
                    "</div>" +

                    '<div class="hot-location">' +
                        '<i class="fas fa-location-dot"></i> ' +
                        product.location +
                    "</div>" +

                "</div>";


            card.addEventListener(
                "click",
                function() {

                    /*
                     * Find the same product
                     * in the main product list.
                     */
                    const originalIndex =
                        allProducts.findIndex(
                            function(p) {

                                return (
                                    p.id ===
                                    product.id
                                );

                            }
                        );


                    if (
                        originalIndex !== -1
                    ) {

                        openProduct(
                            originalIndex,
                            allProducts
                        );

                    }

                }
            );


            container.appendChild(
                card
            );

        }
    );
}


/* =========================================
   RENDER PRODUCT GRID
========================================= */

function renderProductGrid(
    products,
    gridId
) {

    const grid =
        document.getElementById(
            gridId ||
            "productGrid"
        );


    if (!grid) {
        return;
    }


    grid.innerHTML = "";


    if (!products.length) {

        grid.innerHTML =
            '<p class="empty-state">' +
                "No listings yet. " +
                '<a href="sell.html">' +
                    "Be the first to sell something" +
                "</a>." +
            "</p>";

        return;
    }


    products.forEach(
        function(product, index) {

            const saved =
                window.UniBuySaved &&
                window.UniBuySaved.isSaved(
                    product.id
                );


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "product-card";


            card.style.position =
                "relative";


            card.dataset.productIndex =
                index;


            card.innerHTML =

                (
                    product.premium
                        ? '<span class="badge">PREMIUM</span>'
                        : ""
                ) +

                '<button class="favorite' +
                (
                    saved
                        ? " active"
                        : ""
                ) +
                '" aria-label="Save">' +

                    '<i class="fas fa-heart"></i>' +

                "</button>" +

                '<img src="' +
                    product.image +
                    '" alt="' +
                    product.name +
                    '" ' +

                    'onerror="this.onerror=null;this.src=\'' +
                    "https://placehold.co/400x300/e8f0e8/006400?text=" +
                    encodeURIComponent(
                        product.name
                    ) +
                    '\'">' +

                '<div class="card-body">' +

                    '<h3 class="product-name">' +
                        product.name +
                    "</h3>" +

                    '<p class="product-price">' +
                        formatPrice(
                            product.price
                        ) +
                    "</p>" +

                    '<p class="product-location">' +
                        '<i class="fas fa-location-dot"></i>' +
                        product.location +
                    "</p>" +

                "</div>";


            card.addEventListener(
                "click",
                function(e) {

                    const favBtn =
                        e.target.closest(
                            ".favorite"
                        );


                    if (favBtn) {

                        if (
                            window.UniBuySaved
                        ) {

                            const nowSaved =
                                window.UniBuySaved.toggleSaved(
                                    product.id
                                );


                            favBtn.classList.toggle(
                                "active",
                                nowSaved
                            );

                        } else {

                            favBtn.classList.toggle(
                                "active"
                            );

                        }

                        return;
                    }


                    openProduct(
                        index,
                        products
                    );

                }
            );


            grid.appendChild(
                card
            );

        }
    );
}


/* =========================================
   OPEN SWIPE PRODUCT VIEWER
========================================= */

function openProduct(
    index,
    products
) {

    if (
        window.UniBuySwipe &&
        typeof window.UniBuySwipe.open ===
            "function"
    ) {

        window.UniBuySwipe.open(
            index,
            products
        );

    } else {

        console.error(
            "UniBuySwipe is not available."
        );

    }
}


/* =========================================
   PUBLIC API
========================================= */

window.UniBuyProducts = {

    getAll:
        getAllProducts,

    renderGrid:
        renderProductGrid,

    getHot:
        getHotProducts

};


/* =========================================
   PAGE INITIALIZATION
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        const params =
            new URLSearchParams(
                window.location.search
            );


        const campus =
            params.get(
                "campus"
            );


        const searchInput =
            document.querySelector(
                ".search-box input"
            );


        const grid =
            document.getElementById(
                "productGrid"
            );


        if (grid) {

            grid.innerHTML =
                '<p class="empty-state">' +
                    "Loading listings..." +
                "</p>";

        }


        const products =
            await getAllProducts();


        /* ---------- HOT RIGHT NOW ---------- */

        renderHotProducts(
            products
        );


        /* ---------- MAIN FEED ---------- */

        let initialProducts =
            products;


        if (campus) {

            initialProducts =
                products.filter(
                    function(p) {

                        return p.location
                            .toLowerCase()
                            .includes(
                                campus.toLowerCase()
                            );

                    }
                );


            if (searchInput) {

                searchInput.value =
                    campus;

            }

        }


        if (grid) {

            renderProductGrid(
                initialProducts
            );

        }


        /* ---------- SHARED PRODUCT ---------- */

        const sharedProductId =
            params.get(
                "product"
            );


        if (sharedProductId) {

            const sharedIndex =
                products.findIndex(
                    function(p) {

                        return (
                            p.id ===
                            sharedProductId
                        );

                    }
                );


            if (
                sharedIndex !== -1
            ) {

                openProduct(
                    sharedIndex,
                    products
                );

            }

        }


        /* ---------- SEARCH ---------- */

        if (searchInput) {

            searchInput.addEventListener(
                "input",
                function() {

                    const term =
                        searchInput.value
                            .trim()
                            .toLowerCase();


                    const filtered =
                        allProducts.filter(
                            function(p) {

                                return (

                                    p.name
                                        .toLowerCase()
                                        .includes(
                                            term
                                        )

                                    ||

                                    p.location
                                        .toLowerCase()
                                        .includes(
                                            term
                                        )

                                );

                            }
                        );


                    renderProductGrid(
                        filtered
                    );

                }
            );

        }

    }
);